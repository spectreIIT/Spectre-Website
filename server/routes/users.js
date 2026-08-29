import express from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Writeup from '../models/Writeup.js';
import Module from '../models/Module.js';
import ModuleProgress from '../models/ModuleProgress.js';
import UserXpHistory from '../models/UserXpHistory.js';
import ActivityLog from '../models/ActivityLog.js';
import EventRegistration from '../models/EventRegistration.js';
import { protect } from '../middleware/authMiddleware.js';
import { recalculateUserScore } from '../utils/scoreHelper.js';
import sendEmail from '../utils/sendEmail.js';

const router = express.Router();

// @route   GET /api/users/leaderboard
// @desc    Get top users for leaderboard (only operatives who earned points in challenges, modules, events, or writeups)
// @access  Public or Private
router.get('/leaderboard', async (req, res) => {
  try {
    const allUsersWithScore = await User.find({ score: { $gt: 0 } })
      .select('username score avatarUrl solves lastActivityAt updatedAt createdAt')
      .populate('solves.challengeId', 'title points eventId')
      .sort({ score: -1, updatedAt: -1 });

    if (!allUsersWithScore || allUsersWithScore.length === 0) {
      return res.json([]);
    }

    const allUserIds = allUsersWithScore.map(u => u._id);

    // Fetch related records in parallel to determine eligibility and enrich results
    const [
      allProgressList,
      approvedWriteups,
      eventRegistrations,
      loginCounts,
      historyLogs
    ] = await Promise.all([
      ModuleProgress.find({ user: { $in: allUserIds } }).lean(),
      Writeup.find({
        author: { $in: allUserIds },
        status: { $in: ['approved', 'Approved', 'Published', 'published'] },
        pointsAwarded: { $gt: 0 }
      }).lean(),
      EventRegistration.find({
        userId: { $in: allUserIds },
        score: { $gt: 0 }
      }).lean(),
      ActivityLog.aggregate([
        { $match: { userId: { $in: allUserIds }, type: 'login' } },
        { $group: { _id: '$userId', count: { $sum: 1 } } }
      ]),
      UserXpHistory.find({ userId: { $in: allUserIds } }).sort({ timestamp: 1 }).lean()
    ]);

    // Map login score per user (2 points per daily login)
    const loginScoreMap = new Map();
    loginCounts.forEach(lc => {
      loginScoreMap.set(lc._id.toString(), lc.count * 2);
    });

    // Map module points
    const completedProgressList = allProgressList.filter(p => p.isCompleted);
    const completedModuleIds = completedProgressList.map(p => p.moduleId);
    const dbModuleIds = completedModuleIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    const dbModules = await Module.find({ _id: { $in: dbModuleIds } }).lean();

    const modulePointsMap = {
      '1': 100,
      '2': 100,
      '3': 100,
      '4': 100,
      '5': 100
    };
    dbModules.forEach(m => {
      modulePointsMap[m._id.toString()] = m.points || 100;
    });

    // Filter users: only consider people who have earned points from challenges, modules, events, or writeups.
    // Exclude users whose points originate solely from login bonuses.
    const eligibleUsers = allUsersWithScore.filter(u => {
      const uIdStr = u._id.toString();

      // 1. Has solved at least one challenge (global or event challenge)
      const hasChallengeSolve = (u.solves || []).some(s => 
        s.challengeId && (
          (s.awardedPointsAtSolveTime !== undefined && s.awardedPointsAtSolveTime > 0) ||
          (s.challengeId.points !== undefined && s.challengeId.points > 0) ||
          (typeof s.challengeId === 'object')
        )
      );
      if (hasChallengeSolve) return true;

      // 2. Has completed any module or has legacy event bonus
      const userProgress = allProgressList.filter(p => p.user && p.user.toString() === uIdStr);
      const hasModulePoints = userProgress.some(p => 
        p.isCompleted || 
        p.isCompletedDuringEvent ||
        (p.legacyEventBonus && p.legacyEventBonus > 0)
      );
      if (hasModulePoints) return true;

      // 3. Has earned points in any event registration
      const hasEventRegistrationScore = eventRegistrations.some(er => 
        er.userId && er.userId.toString() === uIdStr && er.score > 0
      );
      if (hasEventRegistrationScore) return true;

      // 4. Has approved writeups with awarded points
      const hasWriteupPoints = approvedWriteups.some(w => 
        (w.author || w.authorId || '').toString() === uIdStr && (w.pointsAwarded || 0) > 0
      );
      if (hasWriteupPoints) return true;

      // 5. Total score is greater than login bonus points (earned non-login score > 0)
      const loginScore = loginScoreMap.get(uIdStr) || 0;
      if (u.score > loginScore) return true;

      // Ineligible: user has only gained points from daily login
      return false;
    });

    // Limit to top 100 eligible users
    const topUsers = eligibleUsers.slice(0, 100);

    const enrichedUsers = topUsers.map(u => {
      const uIdStr = u._id.toString();
      const userProgress = completedProgressList.filter(p => p.user && p.user.toString() === uIdStr);
      const completedModules = userProgress.map(p => ({
        moduleId: p.moduleId,
        points: (modulePointsMap[p.moduleId] || 100) + (p.legacyEventBonus || 0),
        timestamp: p.lastActivityAt || p.completedAt || p.updatedAt || new Date()
      }));

      const history = historyLogs.filter(h => h.userId && h.userId.toString() === uIdStr).map(h => ({
        timestamp: h.timestamp,
        score: h.totalXP
      }));

      // Map all solves with accurate points for progression graph
      const mappedSolves = (u.solves || []).filter(s => s.challengeId).map(s => ({
        challengeId: s.challengeId,
        awardedPoints: s.awardedPointsAtSolveTime !== undefined ? s.awardedPointsAtSolveTime : (s.challengeId?.points || 0),
        timestamp: s.solvedAt || s.timestamp || new Date()
      }));

      const userObj = u.toObject();
      userObj.solves = mappedSolves;

      const userWriteups = approvedWriteups.filter(w => 
        (w.author || w.authorId || '').toString() === uIdStr
      ).map(w => ({
        points: w.pointsAwarded,
        timestamp: w.reviewedAt || w.publishedAt || w.updatedAt || w.createdAt
      }));

      return {
        ...userObj,
        completedModules,
        writeups: userWriteups,
        history
      };
    });

    res.json(enrichedUsers);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ message: 'Server error fetching leaderboard' });
  }
});

// @route   GET /api/users/stats
// @desc    Get live platform stats for the landing page
// @access  Public
router.get('/stats', async (req, res) => {
  try {
    const [playerCount, writeupCount] = await Promise.all([
      User.countDocuments({ isVerified: true }),
      Writeup.countDocuments({ status: 'approved', visibility: 'public' }),
    ]);

    // Unique challenge tracks (pulled from writeup tags / challengeName diversity)
    // We treat unique difficulty values as a proxy; real tracks come from challenges
    const tracks = await Writeup.distinct('tags');
    const trackCount = tracks.length > 0 ? tracks.length : 8; // fallback to configured value

    res.json({ players: playerCount, writeups: writeupCount, tracks: trackCount });
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching stats' });
  }
});

// @route   GET /api/users/me/profile
// @desc    Get full profile data for logged-in user (rank, solves, writeups, etc.)
// @access  Private
router.get('/me/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('solves.challengeId');
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Recalculate unified score dynamically
    await recalculateUserScore(user._id);
    const updatedUser = await User.findById(req.user.id).populate('solves.challengeId');

    // Calculate rank — how many verified users have a higher score
    const rank = await User.countDocuments({
      isVerified: true,
      score: { $gt: updatedUser.score }
    });

    // Count user's writeups
    const writeupCount = await Writeup.countDocuments({ author: updatedUser._id });

    // Count completed modules
    const completedModulesCount = await ModuleProgress.countDocuments({ 
      user: updatedUser._id, 
      isCompleted: true 
    });

    // Calculate global solve count (excluding event-specific challenges)
    const globalSolves = (updatedUser.solves || []).filter(s => s.challengeId && !s.challengeId.eventId);

    res.json({
      _id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email,
      role: updatedUser.role,
      score: updatedUser.score,
      avatarUrl: updatedUser.avatarUrl,
      nameChangeCount: updatedUser.nameChangeCount,
      solves: updatedUser.solves || [],
      createdAt: updatedUser.createdAt,
      rank: rank + 1,          // 1-indexed
      writeupCount,
      solveCount: globalSolves.length,
      completedModulesCount
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching profile' });
  }
});

// @route   GET /api/users/:id/profile
// @desc    Get profile data for any user by ID (rank, solves, writeups, totalLikes, etc.)
// @access  Public or Private
router.get('/:id/profile', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('solves.challengeId');
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Calculate rank
    const rank = await User.countDocuments({
      isVerified: true,
      score: { $gt: user.score }
    });

    // Count user's writeups
    const writeupCount = await Writeup.countDocuments({ author: user._id, status: 'approved', visibility: 'public' });

    // Sum upvotes of all author's writeups to show actual total upvotes/likes
    const authorWriteups = await Writeup.find({ author: user._id, status: 'approved', visibility: 'public' });
    const totalLikes = authorWriteups.reduce((acc, w) => acc + (w.upvotes || 0), 0);

    // Calculate global solve count
    const globalSolves = (user.solves || []).filter(s => s.challengeId && !s.challengeId.eventId);

    res.json({
      _id: user._id,
      username: user.username,
      score: user.score,
      avatarUrl: user.avatarUrl,
      rank: rank + 1,
      writeupCount,
      totalLikes,
      solvesCount: globalSolves.length
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching user profile' });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile (username, password, avatar)
// @access  Private
router.put('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { username, password, avatarUrl } = req.body;

    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ message: 'Username is already taken' });
      }

      user.username = username;
    }

    if (avatarUrl !== undefined) {
      user.avatarUrl = avatarUrl;
    }

    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    await user.save();

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      score: user.score,
      avatarUrl: user.avatarUrl,
      nameChangeCount: user.nameChangeCount
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error updating profile' });
  }
});

// @route   POST /api/users/report-bug
// @desc    Report a bug to admins
// @access  Private
router.post('/report-bug', protect, async (req, res) => {
  try {
    const { description } = req.body;
    if (!description) return res.status(400).json({ message: 'Description is required' });

    const admins = await User.find({ role: 'Admin' });
    const adminEmails = admins.map(a => a.email);

    if (adminEmails.length === 0) {
       return res.status(500).json({ message: 'No admins found to receive the report' });
    }

    const message = `Bug Report from User: ${req.user.username} (Email: ${req.user.email})<br><br>Description:<br>${description.replace(/\n/g, '<br>')}`;

    for (const email of adminEmails) {
      await sendEmail({
        email,
        subject: 'Spectre CTF - Bug Report',
        message
      });
    }

    res.json({ message: 'Bug reported successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error reporting bug' });
  }
});

export default router;

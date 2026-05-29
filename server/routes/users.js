import express from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Writeup from '../models/Writeup.js';
import Module from '../models/Module.js';
import ModuleProgress from '../models/ModuleProgress.js';
import UserXpHistory from '../models/UserXpHistory.js';
import { protect } from '../middleware/authMiddleware.js';
import { recalculateUserScore } from '../utils/scoreHelper.js';
import sendEmail from '../utils/sendEmail.js';

const router = express.Router();

// @route   GET /api/users/leaderboard
// @desc    Get top users for leaderboard
// @access  Public or Private
router.get('/leaderboard', async (req, res) => {
  try {
    const topUsers = await User.find({ score: { $gt: 0 } })
      .select('username score avatarUrl solves')
      .populate('solves.challengeId', 'points')
      .sort({ score: -1 })
      .limit(10);

    // Fetch completed modules progress for these top users
    const userIds = topUsers.map(u => u._id);
    const completedProgressList = await ModuleProgress.find({
      user: { $in: userIds },
      isCompleted: true
    }).lean();

    // Map module points
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

    // Fetch history
    const historyLogs = await UserXpHistory.find({ userId: { $in: userIds } }).sort({ timestamp: 1 }).lean();

    const enrichedUsers = topUsers.map(u => {
      const userProgress = completedProgressList.filter(p => p.user.toString() === u._id.toString());
      const completedModules = userProgress.map(p => ({
        moduleId: p.moduleId,
        points: modulePointsMap[p.moduleId] || 100,
        timestamp: p.lastActivityAt || p.completedAt || new Date()
      }));

      const history = historyLogs.filter(h => h.userId.toString() === u._id.toString()).map(h => ({
        timestamp: h.timestamp,
        score: h.totalXP
      }));

      // Fallback: If no history exists, inject current score as one data point
      if (history.length === 0 && u.score > 0) {
        history.push({
          timestamp: new Date(), // Plotting it today
          score: u.score
        });
      }

      // Filter out event-specific solves for the global leaderboard
      const globalSolves = (u.solves || []).filter(s => s.challengeId && !s.challengeId.eventId);
      const userObj = u.toObject();
      userObj.solves = globalSolves;

      return {
        ...userObj,
        completedModules,
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

import Challenge from '../models/Challenge.js';
import Submission from '../models/Submission.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

// @desc    Get all challenges for admin dashboard
// @route   GET /api/admin/challenges
// @access  Private/Admin/Supervisor
export const getChallenges = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'Supervisor') {
      query = {
        $or: [
          { status: { $in: ['active', 'hidden'] } },
          { status: 'draft', createdBy: req.user._id }
        ]
      };
    }

    const challenges = await Challenge.find(query)
      .populate('createdBy', 'username email role')
      .sort({ createdAt: -1 });
    
    // RBAC: Redact description, flags, files, hints, walkthroughs for supervisors if they didn't create it
    const processedChallenges = challenges.map(ch => {
      const challengeObj = ch.toObject();
      const isOwner = challengeObj.createdBy?._id?.toString() === req.user._id.toString();
      
      if (req.user.role === 'Supervisor' && !isOwner) {
        challengeObj.flag = undefined;
        challengeObj.description = 'Read-Only (Access Denied)';
        challengeObj.hints = [];
        challengeObj.files = [];
        challengeObj.walkthroughUrl = undefined;
        challengeObj.isReadOnly = true;
      } else {
        challengeObj.isReadOnly = false;
      }
      return challengeObj;
    });

    res.json(processedChallenges);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching challenges' });
  }
};

// @desc    Create a new challenge
// @route   POST /api/admin/challenges
// @access  Private/Admin/Supervisor
export const createChallenge = async (req, res) => {
  try {
    const challengeData = { ...req.body, createdBy: req.user._id, author: req.user.username };
    const challenge = new Challenge(challengeData);
    await challenge.save();
    res.status(201).json(challenge);
  } catch (error) {
    res.status(500).json({ message: 'Server error creating challenge', error: error.message });
  }
};

// @desc    Update a challenge
// @route   PUT /api/admin/challenges/:id
// @access  Private/Admin/Supervisor
export const updateChallenge = async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) return res.status(404).json({ message: 'Challenge not found' });

    // RBAC check
    if (req.user.role === 'Supervisor' && challenge.createdBy?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You do not have permission to edit this challenge' });
    }

    Object.assign(challenge, req.body);
    await challenge.save();
    
    res.json(challenge);
  } catch (error) {
    res.status(500).json({ message: 'Server error updating challenge', error: error.message });
  }
};

// @desc    Delete a challenge
// @route   DELETE /api/admin/challenges/:id
// @access  Private/Admin/Supervisor
export const deleteChallenge = async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) return res.status(404).json({ message: 'Challenge not found' });

    // RBAC check
    if (req.user.role === 'Supervisor' && challenge.createdBy?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You do not have permission to delete this challenge' });
    }

    await Challenge.findByIdAndDelete(req.params.id);
    // Also delete associated submissions to keep DB clean
    await Submission.deleteMany({ challenge: req.params.id });

    res.json({ message: 'Challenge deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting challenge' });
  }
};

// @desc    Get solves for a specific challenge
// @route   GET /api/admin/challenges/:id/solves
// @access  Private/Admin/Supervisor
export const getSolves = async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) return res.status(404).json({ message: 'Challenge not found' });

    const solves = await Submission.find({ challenge: req.params.id, isCorrect: true })
      .populate('user', 'username email score')
      .sort({ timestamp: -1 });

    // Fallback: Fetch from User solves if some Submission records are missing
    const usersWhoSolved = await User.find({ "solves.challengeId": req.params.id });
    
    // Transform the database mongoose objects to plain objects so we can mutate/push
    const plainSolves = solves.map(s => s.toObject ? s.toObject() : s);

    usersWhoSolved.forEach(user => {
      const alreadyInList = plainSolves.some(s => s.user?._id?.toString() === user._id.toString());
      if (!alreadyInList) {
        const solveEntry = user.solves.find(s => s.challengeId?.toString() === req.params.id.toString());
        if (solveEntry) {
          plainSolves.push({
            _id: solveEntry._id || (user._id + req.params.id),
            user: {
              _id: user._id,
              username: user.username,
              email: user.email,
              score: user.score
            },
            challenge: req.params.id,
            flagSubmitted: 'Correct flag (Synced from user profile)',
            isCorrect: true,
            attemptsBeforeSolve: (solveEntry.attempts || 1) - 1,
            hintsUsed: solveEntry.hintsUsed || [],
            awardedPoints: solveEntry.awardedPointsAtSolveTime || challenge.points,
            challengePointsBeforeSolve: solveEntry.challengePointsBeforeSolve || challenge.points,
            challengePointsAfterSolve: solveEntry.challengePointsAfterSolve || challenge.points,
            rank: solveEntry.rank || 1,
            timestamp: solveEntry.solvedAt
          });
        }
      }
    });

    // Re-sort in descending chronological order
    plainSolves.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json(plainSolves);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching solves' });
  }
};

// @desc    Get analytics for a challenge
// @route   GET /api/admin/challenges/:id/analytics
// @access  Private/Admin/Supervisor
export const getChallengeAnalytics = async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) return res.status(404).json({ message: 'Challenge not found' });

    // Fetch all submissions for this challenge
    const submissions = await Submission.find({ challenge: req.params.id })
      .populate('user', 'username email avatarUrl')
      .sort({ timestamp: 1 }); // Chronological order

    const plainSubmissions = submissions.map(s => s.toObject ? s.toObject() : s);
    const solves = plainSubmissions.filter(s => s.isCorrect);
    const incorrects = plainSubmissions.filter(s => !s.isCorrect);

    // Fallback: Fetch from User solves if some Submission records are missing
    const usersWhoSolved = await User.find({ "solves.challengeId": req.params.id });

    usersWhoSolved.forEach(user => {
      const alreadyInList = solves.some(s => s.user?._id?.toString() === user._id.toString());
      if (!alreadyInList) {
        const solveEntry = user.solves.find(s => s.challengeId?.toString() === req.params.id.toString());
        if (solveEntry) {
          solves.push({
            _id: solveEntry._id || (user._id + req.params.id),
            user: {
              _id: user._id,
              username: user.username,
              email: user.email,
              avatarUrl: user.avatarUrl
            },
            challenge: req.params.id,
            flagSubmitted: 'Correct flag (Synced from user profile)',
            isCorrect: true,
            attemptsBeforeSolve: (solveEntry.attempts || 1) - 1,
            hintsUsed: solveEntry.hintsUsed || [],
            awardedPoints: solveEntry.awardedPointsAtSolveTime || challenge.points,
            challengePointsBeforeSolve: solveEntry.challengePointsBeforeSolve || challenge.points,
            challengePointsAfterSolve: solveEntry.challengePointsAfterSolve || challenge.points,
            rank: solveEntry.rank || 1,
            timestamp: solveEntry.solvedAt
          });
        }
      }
    });

    // Re-sort solves chronologically
    solves.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // First blood
    const firstBlood = solves.length > 0 ? {
      user: {
        username: solves[0].user?.username || 'Unknown',
        email: solves[0].user?.email || '',
        avatarUrl: solves[0].user?.avatarUrl || ''
      },
      solvedAt: solves[0].timestamp,
      attempts: (solves[0].attemptsBeforeSolve || 0) + 1,
      awardedPoints: solves[0].awardedPoints || challenge.points
    } : null;

    // Solver leaderboard / Top solvers
    const topSolvers = solves.slice(0, 10).map((s, idx) => ({
      username: s.user?.username || 'Unknown',
      avatarUrl: s.user?.avatarUrl || '',
      solvedAt: s.timestamp,
      rank: idx + 1,
      awardedPoints: s.awardedPoints || challenge.points,
      attempts: (s.attemptsBeforeSolve || 0) + 1
    }));

    // Timeline: Solves over time
    const timeline = solves.map(s => ({
      username: s.user?.username || 'Unknown',
      timestamp: s.timestamp,
      points: s.awardedPoints || challenge.points
    }));

    // Stats calculations
    const totalSolves = solves.length;
    const totalAttempts = totalSolves + incorrects.length;
    const averageAttempts = totalSolves > 0 ? (totalAttempts / totalSolves).toFixed(1) : 0;
    
    // Hint usage count
    let hintsUnlockedCount = 0;
    solves.forEach(s => {
      hintsUnlockedCount += (s.hintsUsed?.length || 0);
    });
    incorrects.forEach(s => {
      hintsUnlockedCount += (s.hintsUsed?.length || 0);
    });

    res.json({
      challengeId: challenge._id,
      title: challenge.title,
      currentPoints: challenge.currentPoints || challenge.points,
      initialPoints: challenge.initialPoints || challenge.points,
      minimumPoints: challenge.minimumPoints,
      scoringType: challenge.scoringType,
      decayType: challenge.decayType,
      totalSolves,
      firstBlood,
      averageAttempts,
      hintsUnlockedCount,
      topSolvers,
      timeline
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching challenge analytics', error: error.message });
  }
};

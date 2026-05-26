import express from 'express';
import mongoose from 'mongoose';
import Challenge from '../models/Challenge.js';
import User from '../models/User.js';
import Submission from '../models/Submission.js';
import ActivityLog, { toUTCMidnightFn } from '../models/ActivityLog.js';
import { protect } from '../middleware/authMiddleware.js';
import { recalculateUserScore } from '../utils/scoreHelper.js';
import { calculateDecayPoints } from '../utils/scoring.js';

const router = express.Router();

// Get all challenges
router.get('/', protect, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'Member') {
      query = { status: 'active' };
    } else if (req.user.role === 'Supervisor') {
      query = {
        $or: [
          { status: { $in: ['active', 'hidden'] } },
          { status: 'draft', createdBy: req.user._id }
        ]
      };
    } else if (req.user.role === 'Admin') {
      query = {};
    }
    
    // Completely isolate event challenges from the main platform
    query.eventId = null;
    const challenges = await Challenge.find(query).sort({ points: 1 });
    
    // Recalculate score dynamically using scoreHelper (includes both solves & modules)
    await recalculateUserScore(req.user._id);

    const user = await User.findById(req.user._id).populate('solves.challengeId');

    const enrichedChallenges = challenges.map(chal => {
      const isSolved = user.solves.some(s => s.challengeId && s.challengeId._id.toString() === chal._id.toString());
      return {
        ...chal.toObject(),
        isSolved
      };
    });

    res.json(enrichedChallenges);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching challenges' });
  }
});

// Get single challenge
router.get('/:id', protect, async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) return res.status(404).json({ message: 'Challenge not found' });
    
    // Visibility / RBAC check
    if (req.user.role === 'Member' && challenge.status !== 'active') {
      return res.status(403).json({ message: 'Access denied to this challenge' });
    }
    if (req.user.role === 'Supervisor') {
      const isOwner = challenge.createdBy?.toString() === req.user._id.toString();
      if (challenge.status === 'draft' && !isOwner) {
        return res.status(403).json({ message: 'Access denied to this draft challenge' });
      }
    }

    const user = await User.findById(req.user._id);
    let isSolved = user.solves.some(s => s.challengeId && s.challengeId.toString() === challenge._id.toString());
    
    if (challenge.eventId) {
      const Event = mongoose.model('Event');
      const event = await Event.findById(challenge.eventId);
      if (event && event.participationType === 'team') {
        const Team = mongoose.model('Team');
        const team = await Team.findOne({ eventId: event._id, $or: [{ captain: req.user._id }, { members: req.user._id }] });
        if (team) {
          const userTeamIds = [team.captain, ...team.members];
          const teamUsers = await User.find({ _id: { $in: userTeamIds } }).select('solves');
          isSolved = teamUsers.some(u => u.solves.some(s => s.challengeId && s.challengeId.toString() === challenge._id.toString()));
        }
      }
    }
    // Fetch attempts information for the player
    const submissionsCount = await Submission.countDocuments({ user: user._id, challenge: challenge._id });
    const remaining = challenge.maxAttempts > 0 ? Math.max(0, challenge.maxAttempts - submissionsCount) : null;

    res.json({ 
      ...challenge.toObject(), 
      isSolved,
      attemptsSubmitted: submissionsCount,
      remainingAttempts: remaining
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit flag
router.post('/:id/submit', protect, async (req, res) => {
  try {
    const { flag, hintsUsed = [] } = req.body;
    
    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid challenge ID. Are you using real data?' });
    }

    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) return res.status(404).json({ message: 'Challenge not found' });

    // Block submission if challenge is in draft or hidden (for member roles)
    if ((challenge.status === 'draft' || challenge.status === 'hidden') && req.user.role === 'Member') {
      return res.status(403).json({ message: 'This challenge is not currently active.' });
    }

    const user = await User.findById(req.user._id);
    
    let isTeamEvent = false;
    let alreadySolved = false;
    let isPracticeMode = false;

    if (challenge.eventId) {
      const Event = mongoose.model('Event');
      const event = await Event.findById(challenge.eventId);
      if (event) {
        if (Date.now() > new Date(event.endDate).getTime()) {
          isPracticeMode = true;
        }
        if (event.participationType === 'team') {
          isTeamEvent = true;
          const Team = mongoose.model('Team');
          const team = await Team.findOne({ eventId: event._id, $or: [{ captain: req.user._id }, { members: req.user._id }] });
          if (team) {
             const userTeamIds = [team.captain, ...team.members];
             const teamUsers = await User.find({ _id: { $in: userTeamIds } }).select('solves');
             alreadySolved = teamUsers.some(u => u.solves.some(s => s.challengeId && s.challengeId.toString() === challenge._id.toString()));
          }
        }
      }
    }

    if (!isTeamEvent) {
       alreadySolved = user.solves.some(s => s.challengeId && s.challengeId.toString() === challenge._id.toString());
    }

    // Count attempts
    const previousAttemptsCount = await Submission.countDocuments({ user: user._id, challenge: challenge._id });
    if (!alreadySolved && challenge.maxAttempts > 0 && previousAttemptsCount >= challenge.maxAttempts) {
      return res.status(400).json({ message: 'Maximum attempts reached for this challenge.' });
    }

    // Check correctness
    let isCorrect = false;
    const submitted = (flag || '').trim();
    const actualFlag = (challenge.flag || '').trim();

    if (challenge.flagType === 'regex') {
      const flags = challenge.caseSensitive ? '' : 'i';
      isCorrect = new RegExp(actualFlag, flags).test(submitted);
    } else {
      if (challenge.caseSensitive) {
        isCorrect = submitted === actualFlag;
      } else {
        isCorrect = submitted.toLowerCase() === actualFlag.toLowerCase();
      }
    }

    const currentAttempts = previousAttemptsCount + 1;

    if (!isCorrect) {
      // Create incorrect submission record
      await Submission.create({
        user: user._id,
        challenge: challenge._id,
        eventId: challenge.eventId || null,
        flagSubmitted: submitted,
        isCorrect: false,
        attemptsBeforeSolve: previousAttemptsCount,
        hintsUsed
      });

      const remaining = challenge.maxAttempts > 0 ? Math.max(0, challenge.maxAttempts - currentAttempts) : null;
      return res.json({ 
        success: false, 
        message: 'Incorrect flag. Try again!', 
        remainingAttempts: remaining 
      });
    }

    // Correct flag branch
    
    // If it's already solved, allow the submission for validation but do NOT award points or create duplicate entries
    if (alreadySolved) {
      return res.json({ 
        success: true, 
        message: isPracticeMode ? 'Correct flag! (Event Concluded: Already solved by you/team)' : (isTeamEvent ? 'Correct flag! Already solved by your team earlier. No additional points awarded.' : 'Correct flag! You have already solved this.'), 
        points: 0, 
        rank: null 
      });
    }
    // 1. Calculate solves count dynamically to determine rank (Ignore practice solves for ranking)
    const currentSolvesCount = await Submission.countDocuments({ challenge: challenge._id, isCorrect: true, isPractice: { $ne: true } });
    const solveRank = currentSolvesCount + 1;

    // 2. Dynamic decay scoring calculation (Do not decay if practice mode)
    const challengePointsBeforeSolve = challenge.currentPoints || challenge.points;
    const newPoints = isPracticeMode ? challengePointsBeforeSolve : calculateDecayPoints(challenge, solveRank);

    // 3. Atomically update challenge scores/solves ONLY if official solve
    if (!isPracticeMode) {
      challenge.solves = solveRank;
      challenge.currentPoints = newPoints;
      await challenge.save();
    }

    // 4. Calculate hint deductions
    let hintDeductions = 0;
    hintsUsed.forEach(hintIdx => {
      if (challenge.hints && challenge.hints[hintIdx]) {
        hintDeductions += (challenge.hints[hintIdx].cost || 0);
      }
    });

    const awardedPoints = isPracticeMode ? 0 : Math.max(0, newPoints - hintDeductions);

    // 5. Store permanently in User's solves
    user.solves.push({
      challengeId: challenge._id,
      solvedAt: new Date(),
      attempts: currentAttempts,
      hintsUsed,
      awardedPointsAtSolveTime: awardedPoints,
      challengePointsBeforeSolve,
      challengePointsAfterSolve: newPoints,
      rank: isPracticeMode ? null : solveRank
    });
    await user.save();

    // 6. Create correct submission record
    await Submission.create({
      user: user._id,
      challenge: challenge._id,
      eventId: challenge.eventId || null,
      flagSubmitted: submitted,
      isCorrect: true,
      isPractice: isPracticeMode,
      awardedPoints,
      attemptsBeforeSolve: previousAttemptsCount,
      hintsUsed
    });

    // 7. Recalculate user score dynamically
    await recalculateUserScore(user._id);

    // Log Activity for heatmap
    try {
      await ActivityLog.updateOne(
        { userId: user._id, type: 'solve', date: toUTCMidnightFn() },
        { $setOnInsert: { userId: user._id, type: 'solve', date: toUTCMidnightFn() } },
        { upsert: true }
      );
    } catch (err) {
      console.error('Error logging solve activity:', err);
    }

    // Emit socket event for real-time heatmap update
    const io = req.app.get('io');
    if (io) {
      io.to(`activity:${user._id}`).emit('heatmap:update', { type: 'solve' });
      // Emit solve event to update dashboards real-time
      if (!isPracticeMode) {
        io.emit('challenge:solve', { 
          challengeId: challenge._id, 
          solves: solveRank, 
          currentPoints: newPoints 
        });
      }
    }

    return res.json({ 
      success: true, 
      message: isPracticeMode ? 'Correct flag! (Event Concluded: Points not counted)' : 'Flag accepted!',
      points: awardedPoints,
      rank: isPracticeMode ? null : solveRank
    });
  } catch (err) {
    console.error('Error submitting flag:', err);
    res.status(500).json({ message: 'Server error during submission.' });
  }
});

// @route   POST /api/challenges/:id/like
// @desc    Toggle like for a challenge
// @access  Private
router.post('/:id/like', protect, async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) return res.status(404).json({ message: 'Challenge not found' });

    const user = await User.findById(req.user._id);
    
    // Check if solved (optional, but requested by user: "after solving it")
    const isSolved = user.solves.some(s => s.challengeId.toString() === challenge._id.toString());
    if (!isSolved) {
      return res.status(403).json({ message: 'Solve the challenge first to leave a like.' });
    }

    const likeIndex = challenge.likes.indexOf(user._id);
    if (likeIndex === -1) {
      challenge.likes.push(user._id);
    } else {
      challenge.likes.splice(likeIndex, 1);
    }

    await challenge.save();
    res.json({ success: true, likes: challenge.likes.length, isLiked: challenge.likes.includes(user._id) });
  } catch (error) {
    res.status(500).json({ message: 'Server error liking challenge' });
  }
});

// @route   GET /api/challenges/:id/leaderboard
// @desc    Get solve list for leaderboard
// @access  Private
router.get('/:id/leaderboard', protect, async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) return res.status(404).json({ message: 'Challenge not found' });

    if (challenge.status !== 'active' && req.user.role === 'Member') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const solves = await Submission.find({ challenge: req.params.id, isCorrect: true })
      .populate('user', 'username email avatarUrl')
      .sort({ timestamp: 1 });

    const formattedSolves = solves.map((s, idx) => ({
      username: s.user?.username || 'Unknown',
      avatarUrl: s.user?.avatarUrl || '',
      solvedAt: s.timestamp,
      rank: idx + 1,
      attempts: (s.attemptsBeforeSolve || 0) + 1,
      awardedPoints: s.awardedPoints || challenge.points
    }));

    res.json(formattedSolves);
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;

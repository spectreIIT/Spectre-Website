import express from 'express';
import mongoose from 'mongoose';
import ActivityLog, { toUTCMidnightFn } from '../models/ActivityLog.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// ── Centralized Activity Progression Configuration ───────────────────────────
// This configuration defines the weighted contribution points for all platform activities,
// supporting hybrid/mixed task contributions, event duration scaling, and future platform features.
export const ACTIVITY_CONFIG = {
  // Base weights for standard platform actions
  weights: {
    login: 10,
    solve: 30,
    module: 50,
    writeup: 100,
    // Future admin-created event baseline weights
    event_ctf: 150,
    event_workshop: 80,
    event_competition: 120,
    event_custom: 50,
  },
  // Multiplier for time spent actively participating (e.g., points per minute of engagement)
  durationWeightPerMinute: 2,
  // Activity Level thresholds based on accumulated weighted contribution points
  thresholds: {
    LEVEL_1: 10,   // Awarded automatically on login/initial active state
    LEVEL_2: 100,  // Moderate contribution (e.g., 1 writeup, 2 modules, or 3-4 solves)
    LEVEL_3: 250,  // Significant overall contribution and consistency
    LEVEL_4: 500,  // Expert contribution / high engagement
  }
};

// ── Helper: intensity level from accumulated weighted points ────────────────
function pointsToLevel(points) {
  if (points === 0) return 0;
  if (points < ACTIVITY_CONFIG.thresholds.LEVEL_2) return 1; // Level 1: points >= 10 (or > 0)
  if (points < ACTIVITY_CONFIG.thresholds.LEVEL_3) return 2; // Level 2: points >= 100
  if (points < ACTIVITY_CONFIG.thresholds.LEVEL_4) return 3; // Level 3: points >= 250
  return 4;                                                  // Level 4: points >= 500
}

// ── GET /api/activity/heatmap/:userId ────────────────────────────────────────
// Returns the last 52 weeks of activity aggregated by day with weighted contribution points.
router.get('/heatmap/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid userId' });
    }

    const today = toUTCMidnightFn();
    // Grid starts strictly from May 1, 2026
    const rangeStart = new Date(Date.UTC(2026, 4, 1)); // May 1, 2026

    // Fetch all logs within the date range
    const logs = await ActivityLog.find({
      userId: new mongoose.Types.ObjectId(userId),
      date: { $gte: rangeStart, $lte: today },
    }).sort({ date: 1 });

    // Build a lookup map: "YYYY-MM-DD" → { count: 0, points: 0 }
    const dailyStats = {};
    let totalEvents = 0;
    let totalPoints = 0;

    for (const log of logs) {
      const key = log.date.toISOString().slice(0, 10);
      if (!dailyStats[key]) {
        dailyStats[key] = { count: 0, points: 0 };
      }

      dailyStats[key].count += 1;
      totalEvents += 1;

      // Calculate weighted points for this specific log entry
      let pts = 0;
      if (log.customPoints && log.customPoints > 0) {
        pts += log.customPoints;
      } else {
        pts += ACTIVITY_CONFIG.weights[log.type] || ACTIVITY_CONFIG.weights.event_custom || 10;
      }

      // Add time-based participation points if durationMinutes exists
      if (log.durationMinutes && log.durationMinutes > 0) {
        pts += log.durationMinutes * ACTIVITY_CONFIG.durationWeightPerMinute;
      }

      dailyStats[key].points += pts;
      totalPoints += pts;
    }

    // Build the 52-week grid — always start on a Sunday
    // Find the Sunday that is ≤ rangeStart
    const gridStart = new Date(rangeStart);
    const dow = gridStart.getUTCDay(); // 0 = Sunday
    gridStart.setUTCDate(gridStart.getUTCDate() - dow);

    // End exactly 52 weeks (364 days) after gridStart, minus 1 day to make it 364 total days
    const gridEnd = new Date(gridStart);
    gridEnd.setUTCDate(gridEnd.getUTCDate() + 363);

    const days = [];
    const cursor = new Date(gridStart);
    // 52 weeks to always fill the grid area
    while (cursor <= gridEnd) {
      const key = cursor.toISOString().slice(0, 10);
      const stat = dailyStats[key] || { count: 0, points: 0 };
      days.push({ 
        date: key, 
        count: stat.count, 
        points: stat.points, 
        level: pointsToLevel(stat.points) 
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    // Group into weeks (arrays of 7 days, Sunday first)
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    const activeDays = Object.keys(dailyStats).length;

    res.json({ 
      weeks, 
      totalEvents, 
      totalPoints, 
      activeDays, 
      rangeStart: gridStart.toISOString().slice(0, 10),
      config: ACTIVITY_CONFIG 
    });
  } catch (err) {
    console.error('[heatmap]', err);
    res.status(500).json({ message: 'Server error fetching heatmap' });
  }
});

// ── POST /api/activity/log ────────────────────────────────────────────────────
// Protected. Logs one event and emits a socket event to the user's room.
router.post('/log', protect, async (req, res) => {
  try {
    const { type, durationMinutes, customPoints, eventId, eventName } = req.body;
    
    if (!type) {
      return res.status(400).json({ message: 'Activity type is required' });
    }

    const newLog = await ActivityLog.findOneAndUpdate(
      { userId: req.user._id, type, date: toUTCMidnightFn(), eventId: eventId || '' },
      {
        $setOnInsert: {
          userId: req.user._id,
          type,
          eventName: eventName || '',
          date: toUTCMidnightFn()
        },
        $inc: {
          durationMinutes: durationMinutes || 0,
          customPoints: customPoints || 0
        }
      },
      { upsert: true, new: true }
    );

    // Emit socket event — io is attached to app in index.js
    const io = req.app.get('io');
    if (io) {
      io.to(`activity:${req.user._id}`).emit('heatmap:update', { type, logId: newLog._id });
    }

    res.status(201).json({ ok: true, log: newLog });
  } catch (err) {
    console.error('[activity log]', err);
    res.status(500).json({ message: 'Server error logging activity' });
  }
});

export default router;

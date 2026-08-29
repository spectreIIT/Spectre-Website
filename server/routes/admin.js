import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import Module from '../models/Module.js';
import ModuleProgress from '../models/ModuleProgress.js';
import Writeup from '../models/Writeup.js';
import Challenge from '../models/Challenge.js';
import Submission from '../models/Submission.js';
import EventRegistration from '../models/EventRegistration.js';
import Team from '../models/Team.js';
import { protect, isAdmin, isSupervisor } from '../middleware/authMiddleware.js';
import { recalculateUserScore, recalculateEventScore } from '../utils/scoreHelper.js';
import sendEmail from '../utils/sendEmail.js';

const router = express.Router();

// @route   GET /api/admin/users
// @desc    Get all users with stats
// @access  Private/Supervisor
router.get('/users', protect, isSupervisor, async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ score: -1 }).lean();
    
    // Fetch all module progresses and writeups to compute stats efficiently in memory
    const allProgress = await ModuleProgress.find({ isCompleted: true }).lean();
    const allWriteups = await Writeup.find({ status: { $in: ['approved', 'Approved', 'Published'] } }).lean();

    const enrichedUsers = users.map(user => {
      // Filter orphaned and unique solves
      const validSolves = (user.solves || []).filter(s => s.challengeId);
      const uniqueSolves = new Set(validSolves.map(s => (s.challengeId?._id || s.challengeId).toString()));
      const solvesCount = uniqueSolves.size;
      
      // Filter unique completed modules
      const userProgress = allProgress.filter(p => p.user?.toString() === user._id.toString() && p.moduleId);
      const uniqueModules = new Set(userProgress.map(p => (p.moduleId?._id || p.moduleId).toString()));
      const modulesCount = uniqueModules.size;

      const writeupsCount = allWriteups.filter(w => w.author?.toString() === user._id.toString()).length;

      return {
        ...user,
        solvesCount,
        modulesCount,
        writeupsCount
      };
    });

    res.json(enrichedUsers);
  } catch (error) {
    console.error('Error fetching admin users:', error);
    res.status(500).json({ message: 'Server error fetching users' });
  }
});

// @route   GET /api/admin/users/:id
// @desc    Get single user details with full solved challenges, modules, writeups, and events
// @access  Private/Supervisor
router.get('/users/:id', protect, isSupervisor, async (req, res) => {
  try {
    // Ensure user score is unified and accurate
    await recalculateUserScore(req.params.id);

    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('solves.challengeId', 'title category points difficulty eventId')
      .lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Filter orphaned and duplicate solves by both challenge ID and normalized title
    // (catches event vs global clones of the same challenge, and duplicate submissions)
    const validSolves = (user.solves || []).filter(s => s.challengeId);
    const uniqueSolvesMap = new Map();
    
    validSolves.forEach(s => {
      const chalDoc = s.challengeId;
      const id = chalDoc._id ? chalDoc._id.toString() : chalDoc.toString();
      // Normalize title as primary key so cloned event/global challenges merge into one
      const titleKey = chalDoc.title 
        ? chalDoc.title.toLowerCase().trim() 
        : id;

      const awardedPoints = s.awardedPointsAtSolveTime !== undefined 
        ? s.awardedPointsAtSolveTime 
        : (chalDoc?.points || 0);

      const solveObj = {
        ...s,
        awardedPoints,
        solvedAt: s.solvedAt || s.timestamp || new Date()
      };

      if (!uniqueSolvesMap.has(titleKey)) {
        uniqueSolvesMap.set(titleKey, solveObj);
      } else {
        // If duplicate entry exists, keep the one with higher awarded points or earlier solve time
        const existing = uniqueSolvesMap.get(titleKey);
        if ((awardedPoints > (existing.awardedPoints || 0)) || 
            (new Date(solveObj.solvedAt) < new Date(existing.solvedAt))) {
          uniqueSolvesMap.set(titleKey, solveObj);
        }
      }
    });

    const solves = Array.from(uniqueSolvesMap.values());

    // Fetch completed modules for this user with full structure to compute exact earned points
    const moduleProgressList = await ModuleProgress.find({ 
      user: user._id, 
      $or: [{ isCompleted: true }, { isCompletedDuringEvent: true }, { legacyEventBonus: { $gt: 0 } }] 
    }).lean();
      
    const progressModuleIds = moduleProgressList.map(p => p.moduleId);
    const dbModuleIds = progressModuleIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    const dbModules = await Module.find({ _id: { $in: dbModuleIds } }).lean();
    const dbModulesMap = new Map(dbModules.map(m => [m._id.toString(), m]));

    const staticMetadata = {
      '1': { title: 'How HTTP Works', description: 'Understand HTTP requests, responses, status codes, and cookies.', icon: '🌐', color: '#3b82f6', points: 100 },
      '2': { title: 'Cryptography & Encoding', description: 'Learn encoding, hashing, Caesar & Vigenère ciphers.', icon: '🔐', color: '#b026ff', points: 100 },
      '3': { title: 'Network Scanning & Recon', description: 'Network exploration and host discovery.', icon: '📡', color: '#10b981', points: 100 },
      '4': { title: 'Web Security & OWASP Top 10', description: 'Web vulnerability exploitation and defense.', icon: '🛡️', color: '#f59e0b', points: 100 },
      '5': { title: 'Binary Exploitation 101', description: 'Introduction to binary analysis and exploits.', icon: '⚙️', color: '#ef4444', points: 100 },
      'model-1': { title: 'Intro to Databases', description: 'Database management systems and SQL fundamentals.', icon: '🗄️', color: '#00f0ff', points: 100 },
      'design-showcase': { title: 'SPECTRE Design Showcase', description: 'Overview of LMS learning interface modules.', icon: '🎨', color: '#a855f7', points: 100 }
    };

    const uniqueModulesMap = new Map();

    for (const prog of moduleProgressList) {
      const modIdStr = (prog.moduleId || '').toString();
      if (!modIdStr) continue;

      if (uniqueModulesMap.has(modIdStr)) continue;

      const rawMod = dbModulesMap.get(modIdStr);
      let earnedPoints = 0;
      let title = 'Module';
      let description = '';
      let icon = '';
      let color = '';

      if (rawMod) {
        title = rawMod.title || 'Module';
        description = rawMod.description || '';
        icon = rawMod.icon || '';
        color = rawMod.color || '';

        let totalDeductions = 0;
        const revealedHints = new Set(prog.revealedHints || []);
        (rawMod.pages || []).forEach(page => {
          (page.hints || []).forEach(hint => {
            if (revealedHints.has(hint.id)) totalDeductions += (hint.cost || 0);
          });
        });
        if (rawMod.challenge?.hints) {
          rawMod.challenge.hints.forEach(hint => {
            if (revealedHints.has(hint.id)) totalDeductions += (hint.cost || 0);
          });
        }

        if (rawMod.pointsMode === 'page') {
          let pagePoints = 0;
          const completedPages = new Set(prog.completedSections || []);
          const completedQuestions = new Set(prog.completedQuestions || []);
          (rawMod.pages || []).forEach(page => {
            if (completedPages.has(page.id)) pagePoints += (page.points || 0);
            (page.questions || []).forEach(q => {
              if (completedQuestions.has(q.id)) pagePoints += (q.points || 0);
            });
          });
          earnedPoints = Math.max(0, pagePoints - totalDeductions);
        } else {
          earnedPoints = Math.max(0, (rawMod.points || 100) - totalDeductions);
        }

        if (prog.legacyEventBonus) {
          earnedPoints += prog.legacyEventBonus;
        }
      } else if (staticMetadata[modIdStr]) {
        const meta = staticMetadata[modIdStr];
        title = meta.title;
        description = meta.description;
        icon = meta.icon;
        color = meta.color;
        earnedPoints = meta.points || 100;
      } else {
        title = `Core Module #${modIdStr}`;
        earnedPoints = 100;
      }

      uniqueModulesMap.set(modIdStr, {
        _id: modIdStr,
        moduleId: modIdStr,
        title,
        description,
        icon,
        color,
        earnedPoints,
        completedAt: prog.lastActivityAt || prog.updatedAt || prog.createdAt || new Date()
      });
    }

    const modules = Array.from(uniqueModulesMap.values());

    // Fetch writeups for this user
    const writeups = await Writeup.find({ author: user._id })
      .select('title challengeName status pointsAwarded createdAt reviewRemarks')
      .sort({ createdAt: -1 })
      .lean();

    // Fetch event registrations
    const registrations = await EventRegistration.find({ userId: user._id })
      .populate('eventId', 'title startDate endDate thumbnail lifecycleStatus')
      .populate('teamId', 'name points members')
      .lean();

    const events = [];
    for (const reg of registrations) {
      if (!reg.eventId) continue;
      
      let rank = 0;
      if (reg.teamId) {
        // rank is based on team points
        const higherTeams = await Team.countDocuments({ eventId: reg.eventId._id, points: { $gt: reg.teamId.points } });
        rank = higherTeams + 1;
      } else {
        // solo
        const higherUsers = await EventRegistration.countDocuments({ eventId: reg.eventId._id, score: { $gt: reg.score } });
        rank = higherUsers + 1;
      }

      events.push({
        event: reg.eventId,
        team: reg.teamId || null,
        score: reg.teamId ? reg.teamId.points : reg.score,
        rank,
        status: reg.status,
        registeredAt: reg.registeredAt
      });
    }

    res.json({
      user,
      solves,
      modules,
      writeups,
      events
    });
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ message: 'Server error fetching user details', error: error.message, stack: error.stack });
  }
});

// @route   PUT /api/admin/users/:id/role
// @desc    Update user role
// @access  Private/Admin
router.put('/users/:id/role', protect, isAdmin, async (req, res) => {
  try {
    const { role, adminPassword } = req.body;

    if (!adminPassword) {
      return res.status(400).json({ message: 'Admin password is required to change roles' });
    }

    // Verify admin password
    const adminUser = await User.findById(req.user.id);
    const isMatch = await bcrypt.compare(adminPassword, adminUser.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid admin password' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.role = role || user.role;
    await user.save();

    res.json({ message: 'User role updated', user: { _id: user._id, username: user.username, role: user.role } });
  } catch (error) {
    res.status(500).json({ message: 'Server error updating user role' });
  }
});

// @route   POST /api/admin/notifications
// @desc    Create a new notification (permanent or temporary)
// @access  Private/Admin
router.post('/notifications', protect, isAdmin, async (req, res) => {
  try {
    const { title, message, type, recipients, targetUsers, targetEmail, isPermanent } = req.body;

    let resolvedTargetUsers = targetUsers || [];
    if (recipients === 'specific' && targetEmail) {
      const emails = targetEmail.split(',').map(e => e.trim()).filter(Boolean);
      const foundUsers = await User.find({ email: { $in: emails } }).select('_id');
      resolvedTargetUsers = foundUsers.map(u => u._id);
      if (resolvedTargetUsers.length === 0) {
        return res.status(404).json({ message: 'No users found with the provided email address(es).' });
      }
    }

    let eligibleUsers = [];

    if (!isPermanent) {
      // Snapshot current verified users who would be eligible
      const recipientQuery = { isVerified: true };
      if (recipients === 'supervisors') {
        recipientQuery.role = { $in: ['Supervisor', 'Admin'] };
      } else if (recipients === 'members') {
        recipientQuery.role = 'Member';
      } else if (recipients === 'specific' && resolvedTargetUsers.length) {
        recipientQuery._id = { $in: resolvedTargetUsers };
      }
      const currentUsers = await User.find(recipientQuery).select('_id');
      eligibleUsers = currentUsers.map(u => u._id);
    }

    const notification = new Notification({
      title,
      message,
      type: type || 'info',
      recipients: recipients || 'all',
      targetUsers: resolvedTargetUsers,
      sender: req.user._id,
      isPermanent: !!isPermanent,
      eligibleUsers,
      readBy: [],
    });

    await notification.save();

    res.status(201).json({ message: 'Notification broadcasted successfully', notification });
  } catch (error) {
    console.error('Error broadcasting notification:', error);
    res.status(500).json({ message: 'Server error broadcasting notification' });
  }
});

// @route   POST /api/admin/send-mail
// @desc    Send email notification broadcast to users (with Resend -> Brevo failover)
// @access  Private/Admin
router.post('/send-mail', protect, isAdmin, async (req, res) => {
  try {
    const { title, message, recipients, targetEmail } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Email Subject / Title is required.' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Email Message body is required.' });
    }

    let targetEmailList = [];

    if (recipients === 'specific') {
      if (!targetEmail || !targetEmail.trim()) {
        return res.status(400).json({ message: 'Target email address(es) are required for specific recipients.' });
      }
      const rawEmails = targetEmail.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const validEmails = rawEmails.filter(e => emailRegex.test(e));

      if (validEmails.length === 0) {
        return res.status(400).json({ message: 'No valid recipient email address(es) provided.' });
      }
      targetEmailList = Array.from(new Set(validEmails));
    } else {
      let query = { email: { $exists: true, $ne: '' } };
      if (recipients === 'members') {
        query.role = 'Member';
      } else if (recipients === 'supervisors') {
        query.role = { $in: ['Supervisor', 'Admin'] };
      }
      // Query registered users with valid emails
      const users = await User.find(query).select('email username').lean();
      targetEmailList = Array.from(new Set(users.map(u => u.email).filter(Boolean)));
    }

    if (targetEmailList.length === 0) {
      return res.status(404).json({ message: 'No matching user email addresses found.' });
    }

    const sentEmails = [];
    const failedEmails = [];
    const servicesUsed = new Set();

    for (const email of targetEmailList) {
      try {
        const result = await sendEmail({
          email,
          subject: title.trim(),
          title: title.trim(),
          message: message.trim()
        });
        sentEmails.push(email);
        if (result?.service) servicesUsed.add(result.service);
      } catch (err) {
        console.error(`Failed to send email to ${email}:`, err.message);
        failedEmails.push({ email, error: err.message });
      }
    }

    if (sentEmails.length === 0) {
      return res.status(500).json({
        message: `Failed to deliver emails to any recipient. Reason: ${failedEmails[0]?.error || 'Mail service connection error'}`,
        sentCount: 0,
        failedCount: failedEmails.length,
        failedEmails
      });
    }

    const serviceSummary = servicesUsed.size > 0 ? Array.from(servicesUsed).join(' & ') : 'Email Service';

    if (failedEmails.length > 0) {
      return res.status(200).json({
        message: `Sent to ${sentEmails.length} recipient(s) via ${serviceSummary}, but failed for ${failedEmails.length} recipient(s).`,
        sentCount: sentEmails.length,
        failedCount: failedEmails.length,
        failedEmails,
        servicesUsed: Array.from(servicesUsed)
      });
    }

    res.status(200).json({
      message: `Email broadcast sent successfully to ${sentEmails.length} recipient(s) via ${serviceSummary}!`,
      sentCount: sentEmails.length,
      failedCount: 0,
      servicesUsed: Array.from(servicesUsed)
    });
  } catch (error) {
    console.error('Error sending mail broadcast:', error);
    res.status(500).json({ message: `Server error sending email broadcast: ${error.message}` });
  }
});



// ── Module Management (Admin + Supervisor) ────────────────────────
// PUT /api/admin/modules/reorder — reorder modules
router.put('/modules/reorder', protect, isSupervisor, async (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ message: 'orderedIds must be an array of module IDs' });
    }

    const updates = orderedIds.map((id, index) => {
      // In a real scenario we might verify the supervisor owns the modules if they are not Admin.
      // But reordering is typically scoped to an event or global space.
      return Module.findByIdAndUpdate(id, { order: index }, { new: true });
    });

    await Promise.all(updates);

    res.json({ message: 'Modules reordered successfully' });
  } catch (error) {
    console.error('Error reordering modules:', error);
    res.status(500).json({ message: 'Server error reordering modules' });
  }
});

// POST /api/admin/modules — create a new module
router.post('/modules', protect, isSupervisor, async (req, res) => {
  try {
    const { title, icon, color, description, status, unlocked, pages, challenge, points, difficulty, category, banner, eventId, scheduledFor } = req.body;
    const pMode = req.body.pointsMode || 'module';
    let calculatedPoints = points !== undefined ? Number(points) : 100;
    
    if (pMode === 'page' && pages) {
      calculatedPoints = pages.reduce((sum, page) => {
        let pageSum = Number(page.points || 0);
        if (page.questions && page.questions.length > 0) {
          pageSum += page.questions.reduce((qSum, q) => qSum + Number(q.points || 0), 0);
        }
        return sum + pageSum;
      }, 0);
    }

    const mod = new Module({
      title, icon, color, description,
      status: status || 'draft',
      unlocked: unlocked !== false,
      pointsMode: pMode,
      pages: pages || [],
      challenge: challenge || {},
      difficulty: difficulty || 'Beginner',
      category: category || 'General',
      banner: banner || '',
      createdBy: req.user._id,
      eventId: eventId || null,
      scheduledFor: scheduledFor || null,
      points: calculatedPoints
    });
    await mod.save();
    res.status(201).json(mod);
  } catch (err) {
    console.error(err);
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({ message: messages.join(', '), error: err.message });
    }
    res.status(500).json({ message: 'Server error creating module', error: err.message });
  }
});

// PUT /api/admin/modules/:id — update a module
router.put('/modules/:id', protect, isSupervisor, async (req, res) => {
  try {
    const mod = await Module.findById(req.params.id);
    if (!mod) return res.status(404).json({ message: 'Module not found' });

    // RBAC check: Supervisor must be the owner
    if (req.user.role === 'Supervisor' && mod.createdBy?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You do not have permission to edit this module' });
    }

    if (req.body.eventId === '') {
      req.body.eventId = null;
    }
    Object.assign(mod, req.body);
    
    if (mod.pointsMode === 'page') {
      let calcPoints = 0;
      if (mod.pages) {
        mod.pages.forEach(page => {
          calcPoints += Number(page.points || 0);
          if (page.questions && page.questions.length > 0) {
            page.questions.forEach(q => calcPoints += Number(q.points || 0));
          }
        });
      }
      mod.points = calcPoints;
    }
    
    mod.updatedAt = new Date();
    await mod.save();
    res.json(mod);
  } catch (err) {
    console.error(err);
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({ message: messages.join(', '), error: err.message });
    }
    res.status(500).json({ message: 'Server error updating module', error: err.message });
  }
});

// DELETE /api/admin/modules/:id — delete a module (admin or owner supervisor)
router.delete('/modules/:id', protect, isSupervisor, async (req, res) => {
  try {
    const mod = await Module.findById(req.params.id);
    if (!mod) return res.status(404).json({ message: 'Module not found' });

    // RBAC check: Supervisor must be the owner
    if (req.user.role === 'Supervisor' && mod.createdBy?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You do not have permission to delete this module' });
    }

    await Module.findByIdAndDelete(req.params.id);
    await ModuleProgress.deleteMany({ moduleId: req.params.id });
    res.json({ message: 'Module deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error deleting module' });
  }
});

// GET /api/admin/modules/analytics — module completion analytics (admin only)
router.get('/modules/analytics', protect, isSupervisor, async (req, res) => {
  try {
    const allProgress = await ModuleProgress.find({})
      .populate('user', 'username email');
    res.json(allProgress);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching analytics' });
  }
});

// GET /api/admin/notifications — get all sent notifications (admin only)
router.get('/notifications', protect, isAdmin, async (req, res) => {
  try {
    const notifications = await Notification.find({}).populate('sender', 'username').sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching notifications' });
  }
});

// DELETE /api/admin/notifications/:id — delete a notification (admin only)
router.delete('/notifications/:id', protect, isAdmin, async (req, res) => {
  try {
    const notif = await Notification.findByIdAndDelete(req.params.id);
    if (!notif) return res.status(404).json({ message: 'Notification not found' });
    res.json({ message: 'Notification deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error deleting notification' });
  }
});

// ── POST /api/admin/deduplicate-solves ──────────────────────────────────
// @desc  Scan all users for duplicate challenge solves (caused by a race condition
//        bug), deduplicate them, fix Challenge.solves counts, and recalculate scores.
//        Safe to run multiple times — idempotent.
// @access Private (Admin only)
router.post('/deduplicate-solves', protect, isAdmin, async (req, res) => {
  try {
    const report = {
      usersScanned: 0,
      usersAffected: 0,
      duplicatesRemoved: 0,
      submissionDuplicatesRemoved: 0,
      challengeSolvesFixed: [],
      scoreChanges: []
    };

    const users = await User.find({}).populate('solves.challengeId', 'title points');
    report.usersScanned = users.length;

    // Track which challenge IDs need their .solves count fixed
    const challengesToFix = new Set();

    for (const user of users) {
      if (!user.solves || user.solves.length === 0) continue;

      // Group solves by normalized title (or ID), keep the best/earliest for each
      const seenChallenges = new Map();
      const duplicateEntries = [];

      for (const solve of user.solves) {
        if (!solve.challengeId) continue;
        const chalDoc = solve.challengeId;
        const rawId = chalDoc._id ? chalDoc._id.toString() : chalDoc.toString();
        const key = chalDoc.title ? chalDoc.title.toLowerCase().trim() : rawId;
        
        const existing = seenChallenges.get(key);
        if (!existing) {
          seenChallenges.set(key, { ...solve.toObject ? solve.toObject() : solve, rawId });
        } else {
          const newPts = solve.awardedPointsAtSolveTime || chalDoc.points || 0;
          const oldPts = existing.awardedPointsAtSolveTime || (existing.challengeId?.points) || 0;
          
          if (newPts > oldPts || (newPts === oldPts && new Date(solve.solvedAt) < new Date(existing.solvedAt))) {
            duplicateEntries.push(existing._id);
            seenChallenges.set(key, { ...solve.toObject ? solve.toObject() : solve, rawId });
          } else {
            duplicateEntries.push(solve._id);
          }
          challengesToFix.add(rawId);
          challengesToFix.add(existing.rawId);
        }
      }

      if (duplicateEntries.length > 0) {
        report.usersAffected++;
        report.duplicatesRemoved += duplicateEntries.length;

        const oldScore = user.score;

        // Remove duplicate solve entries from user.solves
        await User.findByIdAndUpdate(user._id, {
          $pull: { solves: { _id: { $in: duplicateEntries } } }
        });

        // Also remove duplicate Submission records (keep earliest correct submission per challenge)
        const uniqueChallengeIds = [...seenChallenges.keys()];
        for (const chalId of uniqueChallengeIds) {
          // Find all correct submissions for this user+challenge, sorted by timestamp
          const subs = await Submission.find({
            user: user._id,
            challenge: chalId,
            isCorrect: true
          }).sort({ timestamp: 1 });

          if (subs.length > 1) {
            // Keep first, delete the rest
            const toDelete = subs.slice(1).map(s => s._id);
            await Submission.deleteMany({ _id: { $in: toDelete } });
            report.submissionDuplicatesRemoved += toDelete.length;
          }
        }

        // Recalculate global user score after dedup
        const newScore = await recalculateUserScore(user._id);
        if (newScore !== oldScore) {
          report.scoreChanges.push({
            userId: user._id,
            username: user.username,
            oldScore,
            newScore,
            delta: newScore - oldScore
          });
        }

        // Also recalculate all event scores for events this user is registered for
        const userRegistrations = await EventRegistration.find({ userId: user._id });
        for (const reg of userRegistrations) {
          if (reg.eventId) {
            await recalculateEventScore(reg.eventId, user._id);
          }
        }
      }
    }

    // Fix Challenge.solves counts to reflect unique solvers
    for (const chalId of challengesToFix) {
      // Count unique users who have this challenge in their solves
      const uniqueSolverCount = await User.countDocuments({
        'solves.challengeId': chalId
      });
      const updated = await Challenge.findByIdAndUpdate(
        chalId,
        { $set: { solves: uniqueSolverCount } },
        { new: true }
      );
      if (updated) {
        report.challengeSolvesFixed.push({
          challengeId: chalId,
          title: updated.title,
          newSolvesCount: uniqueSolverCount
        });
      }
    }

    res.json({
      success: true,
      message: `Deduplication complete. ${report.duplicatesRemoved} duplicate solve(s) removed across ${report.usersAffected} user(s).`,
      report
    });
  } catch (err) {
    console.error('Error deduplicating solves:', err);
    res.status(500).json({ message: 'Server error during deduplication', error: err.message });
  }
});

export default router;

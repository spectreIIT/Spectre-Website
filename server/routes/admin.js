import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import Module from '../models/Module.js';
import ModuleProgress from '../models/ModuleProgress.js';
import Writeup from '../models/Writeup.js';
import Challenge from '../models/Challenge.js';
import EventRegistration from '../models/EventRegistration.js';
import Team from '../models/Team.js';
import { protect, isAdmin, isSupervisor } from '../middleware/authMiddleware.js';

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
      const uniqueSolves = new Set(validSolves.map(s => s.challengeId.toString()));
      const solvesCount = uniqueSolves.size;
      
      // Filter unique modules
      const userProgress = allProgress.filter(p => p.user?.toString() === user._id.toString() && p.moduleId);
      const uniqueModules = new Set(userProgress.map(p => p.moduleId.toString()));
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
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('solves.challengeId', 'title category points difficulty')
      .lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Filter orphaned and duplicate solves
    const validSolves = (user.solves || []).filter(s => s.challengeId);
    const uniqueSolvesMap = new Map();
    validSolves.forEach(s => {
      const id = s.challengeId._id ? s.challengeId._id.toString() : s.challengeId.toString();
      uniqueSolvesMap.set(id, s);
    });
    const solves = Array.from(uniqueSolvesMap.values());

    // Fetch completed modules for this user
    const moduleProgress = await ModuleProgress.find({ user: user._id, isCompleted: true })
      .populate('moduleId', 'title description points icon color')
      .lean();
      
    // Filter orphaned and duplicate modules
    const validModules = moduleProgress.map(mp => mp.moduleId).filter(Boolean);
    const uniqueModulesMap = new Map();
    validModules.forEach(m => {
      const id = m._id ? m._id.toString() : m.toString();
      uniqueModulesMap.set(id, m);
    });
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



// ── Module Management (Admin + Supervisor) ────────────────────────

// POST /api/admin/modules — create a new module
router.post('/modules', protect, isSupervisor, async (req, res) => {
  try {
    const { title, icon, color, description, status, unlocked, pages, challenge, points, difficulty, category, banner, eventId } = req.body;
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

export default router;

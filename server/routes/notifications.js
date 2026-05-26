import express from 'express';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Helper: build the query to find notifications visible to this user
function buildVisibilityQuery(user, req) {
  const userId = user._id;
  const isSupervisorOrAdmin = user.role === 'Supervisor' || user.role === 'Admin';
  const isOnlyMember = user.role === 'Member';

  // Base recipient conditions
  const recipientMatch = [
    { recipients: 'all' },
    { recipients: 'specific', targetUsers: userId },
  ];
  if (isSupervisorOrAdmin) {
    recipientMatch.push({ recipients: 'supervisors' });
  }
  if (isOnlyMember) {
    recipientMatch.push({ recipients: 'members' });
  }

  const query = {
    $and: [
      { $or: recipientMatch },
      // Permanent: always visible. Temporary: only if user was eligible when sent.
      {
        $or: [
          { isPermanent: true },
          { isPermanent: false, eligibleUsers: userId }
        ]
      }
    ]
  };

  if (req.query.eventId) {
    query.eventId = req.query.eventId;
  } else {
    query.eventId = null;
  }

  return query;
}

// @route   GET /api/notifications
// @desc    Get all notifications visible to the logged-in user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const query = buildVisibilityQuery(req.user, req);
    const notifications = await Notification.find(query).sort({ createdAt: -1 });

    // Attach isRead flag per notification
    const result = notifications.map(n => ({
      ...n.toObject(),
      isRead: n.readBy.some(id => id.toString() === req.user._id.toString())
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching notifications' });
  }
});

// @route   GET /api/notifications/unread-count
// @desc    Get count of unread notifications for the logged-in user
// @access  Private
router.get('/unread-count', protect, async (req, res) => {
  try {
    const query = buildVisibilityQuery(req.user, req);
    const allVisible = await Notification.find(query).select('readBy');
    const unread = allVisible.filter(
      n => !n.readBy.some(id => id.toString() === req.user._id.toString())
    ).length;
    res.json({ unread });
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching unread count' });
  }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark a single notification as read
// @access  Private
router.put('/:id/read', protect, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) return res.status(404).json({ message: 'Notification not found' });

    const alreadyRead = notification.readBy.some(
      id => id.toString() === req.user._id.toString()
    );
    if (!alreadyRead) {
      notification.readBy.push(req.user._id);
      await notification.save();
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error marking notification read' });
  }
});

// @route   PUT /api/notifications/mark-all-read
// @desc    Mark all visible notifications as read
// @access  Private
router.put('/mark-all-read', protect, async (req, res) => {
  try {
    const query = buildVisibilityQuery(req.user, req);
    const notifications = await Notification.find(query);

    const updates = notifications.map(n => {
      const alreadyRead = n.readBy.some(id => id.toString() === req.user._id.toString());
      if (!alreadyRead) {
        n.readBy.push(req.user._id);
        return n.save();
      }
      return Promise.resolve();
    });

    await Promise.all(updates);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error marking all read' });
  }
});

export default router;

import express from 'express';
import Writeup from '../models/Writeup.js';
import User from '../models/User.js';
import Challenge from '../models/Challenge.js';
import Notification from '../models/Notification.js';
import ActivityLog, { toUTCMidnightFn } from '../models/ActivityLog.js';
import Event from '../models/Event.js';
import EventRegistration from '../models/EventRegistration.js';
import Team from '../models/Team.js';
import { protect, optionalAuth } from '../middleware/authMiddleware.js';
import sendEmail from '../utils/sendEmail.js';

const router = express.Router();

// @route   GET /api/writeups/review/pending
// @desc    Get all writeups for Admin/Supervisor review panel
// @access  Private (Admins & Supervisors Only)
router.get('/review/pending', protect, async (req, res) => {
  try {
    const { status, sort } = req.query;
    console.log(`[Pending Review Request] User: ${req.user?.username}, Role: ${req.user?.role}, Query Status: ${status}, Sort: ${sort}`);

    if (!['Admin', 'Supervisor'].includes(req.user.role)) {
      console.log(`[Pending Review Request] ACCESS DENIED for ${req.user?.username} with role ${req.user?.role}`);
      return res.status(403).json({ message: 'Access denied. Review panel is for Admins and Supervisors only.' });
    }

    let dbStatus = 'ALL';
    if (status) {
      const s = status.toLowerCase();
      if (s === 'pending review' || s === 'pending') dbStatus = 'pending';
      else if (s === 'approved') dbStatus = 'approved';
      else if (s === 'rejected') dbStatus = 'rejected';
      else if (s === 'under review' || s === 'under_review') dbStatus = 'under_review';
      else if (s === 'draft') dbStatus = 'Draft';
      else dbStatus = status;
    }

    const filter = {};
    if (req.query.eventId) {
      filter.eventId = req.query.eventId;
    } else {
      filter.eventId = null;
    }

    if (dbStatus && dbStatus !== 'ALL') {
      filter.status = dbStatus;
    } else {
      filter.status = { $in: ['pending', 'approved', 'rejected', 'under_review', 'Draft'] };
    }

    let sortObj = { createdAt: -1 };
    if (sort === 'oldest') {
      sortObj = { createdAt: 1 };
    } else if (sort === 'highest_points') {
      sortObj = { pointsAwarded: -1 };
    } else if (sort === 'lowest_points') {
      sortObj = { pointsAwarded: 1 };
    } else {
      sortObj = { createdAt: -1 };
    }

    const writeups = await Writeup.find(filter)
      .populate('author', 'username avatarUrl role')
      .populate('reviewedBy', 'username role')
      .sort(sortObj);

    console.log(`[Pending Review Request] Found ${writeups.length} writeups.`);
    res.json(writeups);
  } catch (error) {
    console.error('Error in review/pending:', error);
    res.status(500).json({ message: 'Server error fetching review list' });
  }
});

// @route   PUT /api/writeups/review/:id
// @desc    Approve, reject, assign points, or re-evaluate a writeup
// @access  Private (Admins & Supervisors Only)
router.put('/review/:id', protect, async (req, res) => {
  try {
    if (!['Admin', 'Supervisor'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied. Only Admins and Supervisors can review writeups.' });
    }

    const { status, points, reviewRemarks, featured } = req.body;
    const writeup = await Writeup.findById(req.params.id).populate('author', 'username email score');
    if (!writeup) return res.status(404).json({ message: 'Writeup not found' });

    const oldStatus = writeup.status;
    const oldPoints = writeup.pointsAwarded || 0;

    let dbStatus = status;
    if (status) {
      const s = status.toLowerCase();
      if (s === 'approved' || s === 'approved & publish') dbStatus = 'approved';
      else if (s === 'rejected') dbStatus = 'rejected';
      else if (s === 'under review' || s === 'under_review') dbStatus = 'under_review';
      else if (s === 'pending review' || s === 'pending') dbStatus = 'pending';
    }

    writeup.status = dbStatus || writeup.status;
    
    // Force points to 0 if rejected
    const newPoints = writeup.status === 'rejected' ? 0 : (points !== undefined ? Number(points) : oldPoints);
    writeup.pointsAwarded = newPoints;
    writeup.reviewedBy = req.user._id;
    writeup.reviewRemarks = reviewRemarks !== undefined ? reviewRemarks : writeup.reviewRemarks;
    writeup.reviewedAt = new Date();

    if (writeup.status === 'approved') {
      writeup.visibility = 'public';
      writeup.isPublished = true;
      writeup.publishedAt = new Date();
      writeup.rejectionReason = '';
    } else if (writeup.status === 'rejected') {
      writeup.visibility = 'private';
      writeup.isPublished = false;
      writeup.rejectionReason = reviewRemarks || 'No rejection reason specified';
    } else {
      writeup.visibility = 'private';
      writeup.isPublished = false;
    }

    if (featured !== undefined) writeup.featured = Boolean(featured);

    // Push to reviewer history
    writeup.reviewerHistory.push({
      reviewer: req.user._id,
      reviewerName: req.user.username,
      reviewerRole: req.user.role,
      action: writeup.status,
      points: newPoints,
      remarks: reviewRemarks || '',
      date: new Date()
    });

    // Handle Point Assignment Logic & Activity Progression
    if (writeup.status === 'approved' && oldStatus !== 'approved') {
      if (newPoints > 0 && writeup.author) {
        if (writeup.eventId) {
          // Event-based point assignment
          const event = await Event.findById(writeup.eventId);
          if (event) {
            if (event.participationType === 'team') {
              const reg = await EventRegistration.findOne({ eventId: event._id, userId: writeup.author._id });
              if (reg && reg.teamId) {
                await Team.findByIdAndUpdate(reg.teamId, { $inc: { points: newPoints } });
              }
            } else {
              await EventRegistration.findOneAndUpdate(
                { eventId: event._id, userId: writeup.author._id },
                { $inc: { points: newPoints } }
              );
            }
          }
        } else {
          // Global platform point assignment
          await User.findByIdAndUpdate(writeup.author._id, { $inc: { score: newPoints } });

          try {
            await ActivityLog.create({
              userId: writeup.author._id,
              type: 'writeup',
              customPoints: newPoints,
              eventId: writeup._id.toString(),
              eventName: writeup.title,
              date: toUTCMidnightFn(),
            });

            const io = req.app.get('io');
            if (io) {
              io.to(writeup.author._id.toString()).emit('activity_updated');
              io.to(`activity:${writeup.author._id}`).emit('heatmap:update', { type: 'writeup' });
            }
          } catch (actErr) {
            console.error('Error logging writeup activity:', actErr);
          }
        }
      }
    } else if (writeup.status === 'approved' && oldStatus === 'approved') {
      const diff = newPoints - oldPoints;
      if (diff !== 0 && writeup.author) {
        if (writeup.eventId) {
          const event = await Event.findById(writeup.eventId);
          if (event) {
            if (event.participationType === 'team') {
              const reg = await EventRegistration.findOne({ eventId: event._id, userId: writeup.author._id });
              if (reg && reg.teamId) {
                await Team.findByIdAndUpdate(reg.teamId, { $inc: { points: diff } });
              }
            } else {
              await EventRegistration.findOneAndUpdate(
                { eventId: event._id, userId: writeup.author._id },
                { $inc: { points: diff } }
              );
            }
          }
        } else {
          await User.findByIdAndUpdate(writeup.author._id, { $inc: { score: diff } });
        }
      }
    } else if (oldStatus === 'approved' && writeup.status !== 'approved') {
      // Points subtraction on revocation
      if (oldPoints > 0 && writeup.author) {
        if (writeup.eventId) {
          const event = await Event.findById(writeup.eventId);
          if (event) {
            if (event.participationType === 'team') {
              const reg = await EventRegistration.findOne({ eventId: event._id, userId: writeup.author._id });
              if (reg && reg.teamId) {
                await Team.findByIdAndUpdate(reg.teamId, { $inc: { points: -oldPoints } });
              }
            } else {
              await EventRegistration.findOneAndUpdate(
                { eventId: event._id, userId: writeup.author._id },
                { $inc: { points: -oldPoints } }
              );
            }
          }
        } else {
          await User.findByIdAndUpdate(writeup.author._id, { $inc: { score: -oldPoints } });
        }
      }
    }

    await writeup.save();

    // Create a separate notification and emails for the user/team
    if (writeup.author) {
      try {
        let msg = '';
        let emailSubject = '';
        let emailTitle = '';
        let emailBodyMain = '';

        if (writeup.status === 'approved') {
          msg = `Your writeup '${writeup.title}' was approved by ${req.user.username}. Points Awarded: ${newPoints}`;
          emailSubject = `Spectre Community - Writeup Accepted: ${writeup.title}`;
          emailTitle = 'Writeup Approved & Published!';
          emailBodyMain = `Your writeup <strong>"${writeup.title}"</strong> has been accepted and published by <strong>${req.user.username}</strong>.`;
        } else if (writeup.status === 'rejected') {
          msg = `Your writeup '${writeup.title}' was rejected by ${req.user.username}.`;
          emailSubject = `Spectre Community - Writeup Rejected: ${writeup.title}`;
          emailTitle = 'Writeup Review Update';
          emailBodyMain = `Your writeup <strong>"${writeup.title}"</strong> was reviewed and rejected by <strong>${req.user.username}</strong>.`;
        } else {
          msg = `Your writeup '${writeup.title}' status was updated to ${writeup.status} by ${req.user.username}.`;
        }

        let targetUsers = [writeup.author._id];

        if (writeup.eventId) {
          const event = await Event.findById(writeup.eventId);
          if (event) {
            if (writeup.status === 'approved') {
              msg = `Your writeup for the event '${event.title}' with writeup name '${writeup.title}' was accepted. Points Awarded: ${newPoints}`;
              emailSubject = `Spectre Event [${event.title}] - Writeup Accepted: ${writeup.title}`;
              emailBodyMain = `Your writeup <strong>"${writeup.title}"</strong> for the event <strong>"${event.title}"</strong> has been accepted.`;
            } else if (writeup.status === 'rejected') {
              msg = `Your writeup for the event '${event.title}' with writeup name '${writeup.title}' was rejected.`;
              emailSubject = `Spectre Event [${event.title}] - Writeup Rejected: ${writeup.title}`;
              emailBodyMain = `Your writeup <strong>"${writeup.title}"</strong> for the event <strong>"${event.title}"</strong> was reviewed and rejected.`;
            } else {
              msg = `Your writeup for the event '${event.title}' with writeup name '${writeup.title}' status was updated to ${writeup.status}.`;
            }

            if (event.participationType === 'team') {
              const reg = await EventRegistration.findOne({ eventId: event._id, userId: writeup.author._id });
              if (reg && reg.teamId) {
                const team = await Team.findById(reg.teamId);
                if (team) {
                  targetUsers = team.members;
                  if (writeup.status === 'approved') {
                    msg = `Your team's writeup for the event '${event.title}' with writeup name '${writeup.title}' was accepted. Points Awarded: ${newPoints}`;
                    emailBodyMain = `Your team's writeup <strong>"${writeup.title}"</strong> for the event <strong>"${event.title}"</strong> has been accepted.`;
                  } else if (writeup.status === 'rejected') {
                    msg = `Your team's writeup for the event '${event.title}' with writeup name '${writeup.title}' was rejected.`;
                    emailBodyMain = `Your team's writeup <strong>"${writeup.title}"</strong> for the event <strong>"${event.title}"</strong> was reviewed and rejected.`;
                  } else {
                    msg = `Your team's writeup for the event '${event.title}' with writeup name '${writeup.title}' status was updated to ${writeup.status}.`;
                  }
                }
              }
            }
          }
        }

        await Notification.create({
          title: `Writeup Review: ${writeup.title}`,
          message: msg,
          type: writeup.status === 'rejected' ? 'error' : 'success',
          recipients: 'specific',
          targetUsers: targetUsers,
          eligibleUsers: targetUsers,
          eventId: writeup.eventId || null
        });

        // Send email notifications to all target users (user or team members)
        if (writeup.status === 'approved' || writeup.status === 'rejected') {
          const usersToEmail = await User.find({ _id: { $in: targetUsers }, email: { $exists: true, $ne: '' } });
          
          for (const userObj of usersToEmail) {
            try {
              const isApproved = writeup.status === 'approved';
              const border = isApproved ? '#a855f7' : '#ef4444';

              await sendEmail({
                email: userObj.email,
                subject: emailSubject,
                html: `
                  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0f111a; color: #fff; padding: 30px; border-radius: 12px; border: 1px solid ${border};">
                    <h2 style="color: ${border}; border-bottom: 2px solid ${border}; padding-bottom: 10px;">${emailTitle}</h2>
                    <p>Hello <strong>${userObj.username}</strong>,</p>
                    <p>${emailBodyMain}</p>
                    <div style="background-color: #161925; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid rgba(255,255,255,0.05);">
                      ${isApproved ? `<p style="margin: 5px 0;"><strong>Points Awarded:</strong> <span style="color: #10b981; font-weight: bold; font-size: 1.2rem;">+${newPoints} PTS</span></p>` : ''}
                      ${reviewRemarks ? `<p style="margin: 5px 0;"><strong>Reviewer Remarks:</strong></p><p style="margin: 5px 0; color: #94a3b8; font-style: italic;">${reviewRemarks}</p>` : ''}
                    </div>
                    <p>${isApproved ? 'Thank you for contributing high-quality content to the Spectre Community!' : 'You can view, edit, and resubmit this writeup by navigating to your dashboard.'}</p>
                    <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin: 20px 0;" />
                    <p style="font-size: 0.8rem; color: #64748b; text-align: center;">This is an automated notification from Spectre Community.</p>
                  </div>
                `
              });
            } catch (emailErr) {
              console.error(`Error sending writeup review email to ${userObj.email}:`, emailErr);
            }
          }
        }
      } catch (notifErr) {
        console.error('Error creating review notification:', notifErr);
      }
    }

    res.json(writeup);
  } catch (error) {
    console.error('Error in review/:id:', error);
    res.status(500).json({ message: 'Server error processing review' });
  }
});

// @route   GET /api/writeups
// @desc    Get all writeups (Public catalog + author's own drafts/pending)
// @access  Public or Private
router.get('/', optionalAuth, async (req, res) => {
  try {
    let filter = { status: 'approved', visibility: 'public' };
    
    if (req.query.eventId) {
      filter.eventId = req.query.eventId;
    } else {
      filter.eventId = null;
    }

    if (req.user) {
      filter = {
        $and: [
          filter.eventId ? { eventId: filter.eventId } : { eventId: null },
          {
            $or: [
              { status: 'approved', visibility: 'public' },
              { author: req.user._id }
            ]
          }
        ]
      };
    }
    const writeups = await Writeup.find(filter).populate('author', 'username avatarUrl role').sort({ createdAt: -1 });
    res.json(writeups);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching writeups' });
  }
});

// @route   GET /api/writeups/:id
// @desc    Get single writeup
// @access  Public or Private
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const writeup = await Writeup.findById(req.params.id)
      .populate('author', 'username avatarUrl role nameChangeCount')
      .populate('reviewedBy', 'username role')
      .populate('reviewerHistory.reviewer', 'username role');

    if (!writeup) return res.status(404).json({ message: 'Writeup not found' });

    if (writeup.status !== 'approved' || writeup.visibility !== 'public') {
      if (!req.user || (writeup.author._id.toString() !== req.user._id.toString() && !['Admin', 'Supervisor'].includes(req.user.role))) {
        return res.status(403).json({ message: 'This writeup is pending review or private.' });
      }
    }

    if (req.user) {
      const userId = req.user._id.toString();
      if (!writeup.viewedBy) writeup.viewedBy = [];
      const hasViewed = writeup.viewedBy.map(id => id.toString()).includes(userId);

      if (!hasViewed) {
        writeup.viewedBy.push(req.user._id);
        writeup.views = (writeup.views || 0) + 1;
        await writeup.save();
      }
    }

    if (req.user) {
      try {
        await ActivityLog.updateOne(
          { userId: req.user._id, type: 'writeup', date: toUTCMidnightFn() },
          { $setOnInsert: { userId: req.user._id, type: 'writeup', date: toUTCMidnightFn() } },
          { upsert: true }
        );
        const io = req.app.get('io');
        if (io) io.to(`activity:${req.user._id}`).emit('heatmap:update', { type: 'writeup' });
      } catch (err) {
        console.error('Error logging writeup read activity:', err);
      }
    }

    const isLiked = req.user ? (writeup.upvotedBy && writeup.upvotedBy.map(id => id.toString()).includes(req.user._id.toString())) : false;

    res.json({
      ...writeup.toObject(),
      isLiked
    });
  } catch (error) {
    console.error('Error fetching writeup:', error);
    res.status(500).json({ message: 'Server error fetching writeup' });
  }
});

// @route   POST /api/writeups
// @desc    Create a writeup (Initial status: pending, no automatic points)
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { title, content, challengeName, tags, description, status, eventId } = req.body;

    let challengeId = null;
    if (challengeName) {
      const chObj = await Challenge.findOne({ title: { $regex: new RegExp("^" + challengeName.trim() + "$", "i") } });
      if (chObj) challengeId = chObj._id;
    }

    const writeup = new Writeup({
      title,
      draftTitle: title,
      description,
      draftDescription: description,
      content,
      draftContent: content,
      challengeName,
      draftChallengeName: challengeName,
      tags: tags || [],
      draftTags: tags || [],
      status: status === 'Draft' || status === 'draft' ? 'Draft' : 'pending',
      visibility: 'private',
      author: req.user.id,
      authorId: req.user.id,
      challengeId,
      eventId: eventId || null
    });

    await writeup.save();

    res.status(201).json(writeup);
  } catch (error) {
    console.error('Error creating writeup:', error);
    res.status(500).json({ message: 'Server error creating writeup' });
  }
});

// @route   PUT /api/writeups/:id
// @desc    Edit a writeup while in Draft or pending state
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const { title, content, challengeName, tags, description, status, eventId } = req.body;
    const writeup = await Writeup.findById(req.params.id);
    if (!writeup) return res.status(404).json({ message: 'Writeup not found' });

    if (writeup.author.toString() !== req.user._id.toString() && !['Admin', 'Supervisor'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to edit this writeup.' });
    }

    const currentStatus = (writeup.status || '').toLowerCase();
    if (!['draft', 'pending review', 'pending', 'under_review', 'rejected'].includes(currentStatus) && !['Admin', 'Supervisor'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Cannot edit an approved/published writeup. Please contact an admin.' });
    }

    // Determine target status
    let nextStatus = writeup.status;
    if (status) {
      const s = status.toLowerCase();
      if (s === 'draft') nextStatus = 'Draft';
      else if (s === 'rejected') nextStatus = 'rejected';
      else nextStatus = 'pending';
    }

    const isResubmitting = nextStatus.toLowerCase() === 'pending';

    if (isResubmitting) {
      // Merge draft edits into main fields for review
      writeup.title = title !== undefined ? title : (writeup.draftTitle || writeup.title);
      writeup.content = content !== undefined ? content : (writeup.draftContent || writeup.content);
      writeup.description = description !== undefined ? description : (writeup.draftDescription || writeup.description);
      writeup.tags = tags !== undefined ? tags : (writeup.draftTags || writeup.tags);
      if (challengeName) {
        writeup.challengeName = challengeName;
        const chObj = await Challenge.findOne({ title: { $regex: new RegExp("^" + challengeName.trim() + "$", "i") } });
        writeup.challengeId = chObj ? chObj._id : null;
      }
      
      writeup.draftTitle = writeup.title;
      writeup.draftContent = writeup.content;
      writeup.draftDescription = writeup.description;
      writeup.draftChallengeName = writeup.challengeName;
      writeup.draftTags = writeup.tags;
      writeup.status = 'pending';
      writeup.visibility = 'private';
    } else {
      // Save draft edit privately; do not modify main fields so reviewers see old content
      writeup.draftTitle = title !== undefined ? title : writeup.draftTitle;
      writeup.draftContent = content !== undefined ? content : writeup.draftContent;
      writeup.draftDescription = description !== undefined ? description : writeup.draftDescription;
      writeup.draftTags = tags !== undefined ? tags : writeup.draftTags;
      if (challengeName) {
        writeup.draftChallengeName = challengeName;
      }
      
      if (eventId !== undefined) writeup.eventId = eventId || null;
      writeup.status = nextStatus;
      writeup.visibility = 'private';
    }

    writeup.authorId = writeup.author;

    await writeup.save();
    res.json(writeup);
  } catch (error) {
    console.error('Error editing writeup:', error);
    res.status(500).json({ message: 'Server error editing writeup' });
  }
});

// @route   DELETE /api/writeups/:id
// @desc    Delete a writeup
// @access  Private (Author if Draft/pending, Admins Only otherwise)
router.delete('/:id', protect, async (req, res) => {
  try {
    const writeup = await Writeup.findById(req.params.id);
    if (!writeup) return res.status(404).json({ message: 'Writeup not found' });

    if (req.user.role === 'Admin') {
      // Deduct points if approved and points were awarded
      if (writeup.status === 'approved' && (writeup.pointsAwarded || 0) > 0 && writeup.author) {
        await User.findByIdAndUpdate(writeup.author, { $inc: { score: -writeup.pointsAwarded } });
      }
      await Writeup.deleteOne({ _id: writeup._id });
      return res.json({ message: 'Writeup removed by Admin' });
    }

    if (writeup.author.toString() === req.user._id.toString()) {
      if (['Draft', 'Pending Review', 'pending', 'under_review'].includes(writeup.status)) {
        await Writeup.deleteOne({ _id: writeup._id });
        return res.json({ message: 'Writeup removed' });
      } else {
        return res.status(403).json({ message: 'Cannot delete an approved/published writeup without admin permission.' });
      }
    }

    return res.status(403).json({ message: 'Not authorized to delete this writeup.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error deleting writeup' });
  }
});

// @route   PUT /api/writeups/:id/upvote
// @desc    Toggle upvote for a writeup
// @access  Private
router.put('/:id/upvote', protect, async (req, res) => {
  try {
    const writeup = await Writeup.findById(req.params.id);
    if (!writeup) return res.status(404).json({ message: 'Writeup not found' });

    const userId = req.user._id;
    if (!writeup.upvotedBy) writeup.upvotedBy = [];
    const alreadyUpvoted = writeup.upvotedBy.map(id => id.toString()).includes(userId.toString());

    if (alreadyUpvoted) {
      writeup.upvotedBy = writeup.upvotedBy.filter(id => id.toString() !== userId.toString());
      writeup.upvotes = Math.max(0, (writeup.upvotes || 1) - 1);
    } else {
      writeup.upvotedBy.push(userId);
      writeup.upvotes = (writeup.upvotes || 0) + 1;
    }

    await writeup.save();
    res.json({ upvotes: writeup.upvotes, isLiked: !alreadyUpvoted });
  } catch (error) {
    console.error('Error toggling upvote:', error);
    res.status(500).json({ message: 'Server error toggling upvote' });
  }
});

export default router;

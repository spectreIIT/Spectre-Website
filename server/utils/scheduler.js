import cron from 'node-cron';
import mongoose from 'mongoose';
import Challenge from '../models/Challenge.js';
import Module from '../models/Module.js';
import Notification from '../models/Notification.js';
import EventRegistration from '../models/EventRegistration.js';

let ioInstance;

export const initScheduler = (io) => {
  ioInstance = io;

  // Run every minute at the 0th second
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      // We look back 1 minute window to find what just got launched
      const oneMinuteAgo = new Date(now.getTime() - 60000);

      // 1. Check for Challenges that just launched
      const newChallenges = await Challenge.find({
        status: 'active',
        eventId: { $ne: null },
        scheduledFor: { $gt: oneMinuteAgo, $lte: now }
      });

      for (const chal of newChallenges) {
        await notifyEventUsers(chal.eventId, 'New Challenge Unlocked', `The challenge "${chal.title}" is now active in your event!`);
      }

      // 2. Check for Modules that just launched
      const newModules = await Module.find({
        status: 'active',
        eventId: { $ne: null },
        scheduledFor: { $gt: oneMinuteAgo, $lte: now }
      });

      for (const mod of newModules) {
        await notifyEventUsers(mod.eventId, 'New Module Unlocked', `The module "${mod.title}" is now active!`);
      }

      // 3. Check for specific Pages inside active Modules
      const activeModules = await Module.find({ status: 'active', eventId: { $ne: null } });
      for (const mod of activeModules) {
        let notifiedPages = [];
        for (const page of mod.pages) {
          if (page.scheduledFor && page.scheduledFor > oneMinuteAgo && page.scheduledFor <= now) {
            notifiedPages.push(page.title);
          }
        }
        if (notifiedPages.length > 0) {
          await notifyEventUsers(mod.eventId, 'Module Page Unlocked', `New content unlocked in "${mod.title}": ${notifiedPages.join(', ')}`);
        }
      }

    } catch (err) {
      console.error('Scheduler error:', err);
    }
  });
};

const notifyEventUsers = async (eventId, title, message) => {
  try {
    const registrations = await EventRegistration.find({ eventId });
    if (!registrations || registrations.length === 0) return;

    const userIds = registrations.map(r => r.userId);

    const notification = new Notification({
      title,
      message,
      type: 'info',
      recipients: 'specific',
      targetUsers: userIds,
      eventId: eventId,
      isPermanent: false,
      eligibleUsers: userIds
    });

    await notification.save();

    // The frontend listens to socket room "activity:userId" OR the app fetches /api/notifications.
    // If the frontend does not explicitly join "activity:userId" for general notifications,
    // they will just receive it on next poll. But we can try emitting if they joined 'activity:userId'.
    if (ioInstance) {
      userIds.forEach(uid => {
        ioInstance.to(`activity:${uid.toString()}`).emit('new-notification', notification);
      });
    }
  } catch (err) {
    console.error('Failed to notify users:', err);
  }
};

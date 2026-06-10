import express from 'express';
import mongoose from 'mongoose';
import Event from '../models/Event.js';
import EventRegistration from '../models/EventRegistration.js';
import Challenge from '../models/Challenge.js';
import Module from '../models/Module.js';
import Submission from '../models/Submission.js';
import Team from '../models/Team.js';
import { protect, isAdmin, isSupervisor } from '../middleware/authMiddleware.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';

const router = express.Router();

// Helper to archive event and migrate its challenges/modules to global with 50% points
async function archiveEventAndMigrateContent(event) {
  if (event.status === 'archived') return;

  event.status = 'archived';
  await Event.findByIdAndUpdate(event._id, { status: 'archived' });

  try {
    // 1. Clone Challenges to Global
    const challenges = await Challenge.find({ eventId: event._id });
    for (const c of challenges) {
       let globalChallenge = await Challenge.findOne({ title: c.title, eventId: null });
       if (!globalChallenge) {
         const newPoints = Math.round((c.currentPoints || c.points) * 0.5);
         const cObj = c.toObject();
         delete cObj._id;
         
         const newChallenge = new Challenge({
             ...cObj,
             eventId: null,
             points: newPoints,
             initialPoints: newPoints,
             currentPoints: newPoints,
             scoringType: 'static',
             status: 'active',
             solves: 0,
             createdAt: Date.now()
         });
         globalChallenge = await newChallenge.save();
       }

       // Migrate user solves for this challenge
       const correctSubmissions = await Submission.find({ challenge: c._id, isCorrect: true, isPractice: { $ne: true } });
       for (const sub of correctSubmissions) {
          const user = await User.findById(sub.user);
          if (user) {
             const hasGlobalSolve = user.solves.some(s => s.challengeId && s.challengeId.toString() === globalChallenge._id.toString());
             if (!hasGlobalSolve) {
                const oldSolve = user.solves.find(s => s.challengeId && s.challengeId.toString() === c._id.toString());
                const awardedPoints = oldSolve ? oldSolve.awardedPointsAtSolveTime : (sub.awardedPoints || c.points);
                
                user.solves.push({
                   challengeId: globalChallenge._id,
                   solvedAt: sub.timestamp,
                   attempts: sub.attemptsBeforeSolve ? sub.attemptsBeforeSolve + 1 : 1,
                   hintsUsed: sub.hintsUsed || [],
                   awardedPointsAtSolveTime: awardedPoints,
                   challengePointsBeforeSolve: awardedPoints,
                   challengePointsAfterSolve: awardedPoints,
                   rank: null
                });
                await user.save();
             }
          }
       }
    }

    // 2. Clone Modules to Global
    const modules = await Module.find({ eventId: event._id });
    const ModuleProgress = mongoose.model('ModuleProgress');
    for (const m of modules) {
       let globalModule = await Module.findOne({ title: m.title, eventId: null });
       if (!globalModule) {
         const modObj = m.toObject();
         delete modObj._id;
         
         const newPoints = Math.round((m.points || 0) * 0.5);
         
         if (modObj.pages && modObj.pages.length > 0) {
            modObj.pages.forEach(page => {
               page.points = Math.round((page.points || 0) * 0.5);
               if (page.questions && page.questions.length > 0) {
                  page.questions.forEach(q => {
                     q.points = Math.round((q.points || 0) * 0.5);
                  });
               }
            });
         }

         const newModule = new Module({
             ...modObj,
             eventId: null,
             points: newPoints,
             status: 'active',
             createdAt: Date.now()
         });
         globalModule = await newModule.save();
       }

       // Migrate Module Progress
       const progresses = await ModuleProgress.find({ moduleId: m._id.toString() });
       for (const prog of progresses) {
          if (!prog.isCompletedDuringEvent && (!prog.completedSectionsDuringEvent || prog.completedSectionsDuringEvent.length === 0)) {
             continue; // No progress made during the event
          }
          const existingGlobalProg = await ModuleProgress.findOne({ user: prog.user, moduleId: globalModule._id.toString() });
          if (!existingGlobalProg) {
             let eventPointsEarned = 0;
             let globalPointsEarned = 0;
             let totalDeductions = 0;
             const revealedHints = new Set(prog.revealedHints || []);
             m.pages.forEach(page => {
               if (page.hints) {
                 page.hints.forEach(hint => {
                   if (revealedHints.has(hint.id)) {
                     totalDeductions += (hint.cost || 0);
                   }
                 });
               }
             });
             if (m.challenge && m.challenge.hints) {
               m.challenge.hints.forEach(hint => {
                 if (revealedHints.has(hint.id)) {
                   totalDeductions += (hint.cost || 0);
                 }
               });
             }


             if (m.pointsMode === 'page') {
                let pagePoints = 0;
                let globalPagePoints = 0;
                const completedPages = new Set(prog.completedSectionsDuringEvent || []);
                const completedQuestions = new Set(prog.completedQuestionsDuringEvent || []);
                
                m.pages.forEach(page => {
                   if (completedPages.has(page.id)) {
                      pagePoints += (page.points || 0);
                      // Global points were halved
                      globalPagePoints += Math.round((page.points || 0) * 0.5);
                   }
                   if (page.questions && page.questions.length > 0) {
                      page.questions.forEach(q => {
                         if (completedQuestions.has(q.id)) {
                            pagePoints += (q.points || 0);
                            globalPagePoints += Math.round((q.points || 0) * 0.5);
                         }
                      });
                   }
                });
                eventPointsEarned = Math.max(0, pagePoints - totalDeductions);
                globalPointsEarned = Math.max(0, globalPagePoints - totalDeductions);
             } else {
                if (prog.isCompletedDuringEvent) {
                   eventPointsEarned = Math.max(0, (m.points || 0) - totalDeductions);
                   globalPointsEarned = Math.max(0, Math.round((m.points || 0) * 0.5) - totalDeductions);
                }
             }

             if (prog.isCompletedDuringEvent) {
                const scheduleDate = m.scheduledFor ? new Date(m.scheduledFor) : new Date(m.createdAt);
                const completionDate = new Date(prog.lastActivityAt || new Date());
                
                const releaseDay = scheduleDate.toISOString().split('T')[0];
                const completionDay = completionDate.toISOString().split('T')[0];
                if (releaseDay === completionDay) {
                   eventPointsEarned += 5;
                }
             }

             if (eventPointsEarned > 0 || prog.isCompletedDuringEvent) {
                const newProg = new ModuleProgress({
                   user: prog.user,
                   moduleId: globalModule._id.toString(),
                   completedSections: prog.completedSectionsDuringEvent || [],
                   completedQuestions: prog.completedQuestionsDuringEvent || [],
                   revealedHints: prog.revealedHints || [],
                   quizResults: prog.quizResults || [],
                   isCompleted: prog.isCompletedDuringEvent,
                   lastActivityAt: prog.lastActivityAt,
                   legacyEventBonus: Math.max(0, eventPointsEarned - globalPointsEarned)
                });
                await newProg.save();
             }
          }
       }
    }
  } catch (err) {
    console.error('Error migrating event content:', err);
  }
}

// ── GET /api/events ──────────────────────────────────────────────────────────
// Get all active/public events for users, or all for admins/supervisors
router.get('/', protect, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'Member') {
      query = { status: { $in: ['active', 'archived'] }, isPublic: true };
    }
    
    const events = await Event.find(query).sort({ startDate: -1 }).populate('createdBy', 'username');
    
    const now = Date.now();
    const eventsWithStats = await Promise.all(events.map(async (ev) => {
      let lifecycleStatus = 'active';
      if (now < new Date(ev.startDate).getTime()) {
        lifecycleStatus = 'upcoming';
      } else if (now > new Date(ev.endDate).getTime()) {
        lifecycleStatus = 'past';
        if (ev.status === 'active') {
          await archiveEventAndMigrateContent(ev);
        }
      }

      const participantsCount = await EventRegistration.countDocuments({ eventId: ev._id });
      const reg = await EventRegistration.findOne({ eventId: ev._id, userId: req.user._id });
      return { ...ev.toObject(), participantsCount, isRegistered: !!reg, lifecycleStatus };
    }));
    
    res.json(eventsWithStats);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching events' });
  }
});

// ── GET /api/events/active ───────────────────────────────────────────────────
router.get('/active', protect, async (req, res) => {
  try {
    const event = await Event.findOne({ status: 'active' }).populate('createdBy', 'username');
    if (!event) return res.status(404).json({ message: 'No active event found' });
    res.json(event);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching active event' });
  }
});

// ── GET /api/events/:id ──────────────────────────────────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate('organizers', 'username avatarUrl').populate('createdBy', 'username');
    if (!event) return res.status(404).json({ message: 'Event not found' });

    if (req.user.role === 'Member' && event.status === 'hidden') {
      return res.status(403).json({ message: 'Event is not available' });
    }

    // Check if user is registered
    const registration = await EventRegistration.findOne({ eventId: event._id, userId: req.user._id });
    const isRegistered = !!registration;

    let userTeam = null;
    if (registration && registration.teamId) {
      userTeam = await Team.findById(registration.teamId).select('name inviteCode members captain');
    }

    let participantsCount = 0;
    if (event.participationType === 'team') {
      const uniqueTeams = await EventRegistration.distinct('teamId', { eventId: event._id, teamId: { $ne: null } });
      participantsCount = uniqueTeams.length;
    } else {
      participantsCount = await EventRegistration.countDocuments({ eventId: event._id });
    }

    const now = Date.now();
    let lifecycleStatus = 'active';
    if (now < new Date(event.startDate).getTime()) {
      lifecycleStatus = 'upcoming';
    } else if (now > new Date(event.endDate).getTime()) {
      lifecycleStatus = 'past';
      if (event.status === 'active') {
        await archiveEventAndMigrateContent(event);
      }
    }

    const isScoreFrozen = lifecycleStatus === 'past';
    const isPracticeMode = lifecycleStatus === 'past' && !isRegistered;
    const isOfficialParticipant = isRegistered;
    const isRegistrationOpen = lifecycleStatus !== 'past' && event.registrationEnabled;

    res.json({ 
      ...event.toObject(), 
      isRegistered, 
      userTeam, 
      participantsCount,
      lifecycleStatus,
      isPracticeMode,
      isOfficialParticipant,
      isScoreFrozen,
      isRegistrationOpen
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching event details' });
  }
});

// ── POST /api/events ─────────────────────────────────────────────────────────
// Admin only: create a new event
router.post('/', protect, isAdmin, async (req, res) => {
  try {
    let slug = req.body.slug;
    if (!slug && req.body.title) {
      slug = req.body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    }
    const event = new Event({ ...req.body, slug, createdBy: req.user._id });
    await event.save();
    res.status(201).json(event);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Event slug must be unique' });
    res.status(500).json({ message: 'Server error creating event' });
  }
});

// ── PUT /api/events/:id ──────────────────────────────────────────────────────
// Admin only: update event
router.put('/:id', protect, isAdmin, async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json(event);
  } catch (err) {
    res.status(500).json({ message: 'Server error updating event' });
  }
});

// ── DELETE /api/events/:id ───────────────────────────────────────────────────
router.delete('/:id', protect, isAdmin, async (req, res) => {
  try {
    await Event.findByIdAndDelete(req.params.id);
    // Cleanup related data
    await EventRegistration.deleteMany({ eventId: req.params.id });
    await Challenge.deleteMany({ eventId: req.params.id });
    await Module.deleteMany({ eventId: req.params.id });
    
    res.json({ message: 'Event deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error deleting event' });
  }
});

// ── POST /api/events/:id/register ────────────────────────────────────────────
router.post('/:id/register', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    if (!event.registrationEnabled) {
      return res.status(400).json({ message: 'Registration is not enabled for this event' });
    }

    // Allow registration even if upcoming, but not if draft/hidden
    if (event.status === 'draft' || event.status === 'hidden') {
      return res.status(400).json({ message: 'Registration is not available for this event' });
    }

    // Check registration dates
    const now = new Date();
    if (event.registrationStart && now < event.registrationStart) {
      return res.status(400).json({ message: 'Registration has not started yet' });
    }

    const isEventEnded = now > event.endDate;
    
    if (event.registrationEndType === 'specific') {
      if (event.registrationEndDate && now > event.registrationEndDate) {
        return res.status(400).json({ message: 'Registration deadline has passed' });
      }
    } else {
      if (isEventEnded) {
        return res.status(400).json({ message: 'Event has ended. Registration is closed.' });
      }
    }

    // Check capacity
    if (event.maxParticipants > 0) {
      const count = await EventRegistration.countDocuments({ eventId: event._id });
      if (count >= event.maxParticipants) {
        return res.status(400).json({ message: 'Event is full' });
      }
    }

    // Team Logic


    const registration = new EventRegistration({
      eventId: event._id,
      userId: req.user._id,
      teamId: null
    });
    await registration.save();
    
    res.status(201).json({ message: 'Successfully registered for the event' });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'You are already registered' });
    console.error(err);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// ── GET /api/events/:id/challenges ───────────────────────────────────────────
router.get('/:id/challenges', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    let query = { eventId: event._id };
    const isArenaView = req.query.arena === 'true';

    if (req.user.role === 'Member' || isArenaView) {
      if (event.status !== 'active' && event.status !== 'archived') {
        return res.status(403).json({ message: 'Event is not active' });
      }
      
      const now = new Date();
      if (now < event.startDate) {
        return res.status(403).json({ message: 'Event has not started yet' });
      }

      // Must be registered if registration is enabled AND event is NOT past (Practice mode allows viewing without registration)
      if (event.registrationEnabled && now <= event.endDate) {
        const reg = await EventRegistration.findOne({ eventId: event._id, userId: req.user._id });
        if (!reg) return res.status(403).json({ message: 'You must register for this event to view challenges' });
      }
      query.status = 'active';
    } else if (req.user.role === 'Supervisor' && !isArenaView) {
      // Supervisors can see all challenges in the event if they are organizers, otherwise only active/hidden + their own
      query.$or = [
        { status: { $in: ['active', 'hidden'] } },
        { status: 'draft', createdBy: req.user._id }
      ];
    }

    const challenges = await Challenge.find(query).sort({ points: 1 });
    
    // Attach 'isSolved' info for everyone viewing the public grid
    const isTeamEvent = event.participationType === 'team';
    let userTeamIds = [req.user._id];
    
    if (isTeamEvent) {
      const team = await Team.findOne({ eventId: event._id, $or: [{ captain: req.user._id }, { members: req.user._id }] });
      console.log(`[DEBUG] Team search for user ${req.user._id} in event ${event._id}. Found team:`, team ? team._id : 'None');
      if (team) {
        userTeamIds = [team.captain, ...team.members];
        console.log(`[DEBUG] userTeamIds array:`, userTeamIds);
      }
    }

    const usersInTeam = await mongoose.model('User').find({ _id: { $in: userTeamIds } }).select('solves');
    console.log(`[DEBUG] Found ${usersInTeam.length} users for team.`);
    
    const solvedChallengeIds = new Set();
    usersInTeam.forEach(u => {
      if (u.solves) {
        u.solves.forEach(s => {
          if (s.challengeId) solvedChallengeIds.add(s.challengeId.toString());
        });
      }
    });
    console.log(`[DEBUG] Solved challenge IDs for team:`, Array.from(solvedChallengeIds));

    let enrichedChallenges = challenges.map(chal => {
      const isSolved = solvedChallengeIds.has(chal._id.toString());
      return { ...chal.toObject(), isSolved };
    });

    res.json(enrichedChallenges);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching event challenges' });
  }
});

// ── GET /api/events/:id/modules ──────────────────────────────────────────────
router.get('/:id/modules', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    let query = { eventId: event._id };
    if (req.user.role === 'Member') {
      if (event.status !== 'active' && event.status !== 'archived') {
        return res.status(403).json({ message: 'Event is not active' });
      }
      if (event.registrationEnabled && new Date() <= event.endDate) {
        const reg = await EventRegistration.findOne({ eventId: event._id, userId: req.user._id });
        if (!reg) return res.status(403).json({ message: 'You must register for this event to view modules' });
      }
      query.status = 'active';
    } else if (req.user.role === 'Supervisor') {
      query.$or = [
        { status: { $in: ['active', 'hidden'] } },
        { status: 'draft', createdBy: req.user._id }
      ];
    }

    const modules = await Module.find(query).sort({ createdAt: 1 });
    res.json(modules);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching event modules' });
  }
});

// ── GET /api/events/:id/leaderboard ──────────────────────────────────────────
router.get('/:id/leaderboard', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    if (!event.showLeaderboard && req.user.role === 'Member') {
      return res.status(403).json({ message: 'Leaderboard is hidden for this event' });
    }

    const isTeamEvent = event.participationType === 'team';

    // A simple leaderboard aggregation based on Submissions for this event
    const submissions = await Submission.find({ eventId: event._id, isCorrect: true, isPractice: { $ne: true } })
      .populate('user', 'username avatarUrl')
      .sort({ timestamp: 1 });

    let userToTeamMap = {};
    let teamsMap = {};
    if (isTeamEvent) {
      const teams = await Team.find({ eventId: event._id });
      teams.forEach(t => {
        teamsMap[t._id.toString()] = t;
        t.members.forEach(memberId => {
          userToTeamMap[memberId.toString()] = t._id.toString();
        });
        if (t.captain) {
           userToTeamMap[t.captain.toString()] = t._id.toString();
        }
      });
    }

    const registrations = await EventRegistration.find({ eventId: event._id });
    const registeredUserIds = new Set(registrations.map(r => r.userId.toString()));

    const entityScores = {};

    // Helper to get or create entity score block
    const getEntity = (userDoc) => {
      if (!userDoc) return null;
      if (!registeredUserIds.has(userDoc._id.toString())) return null;
      
      let entityId = userDoc._id.toString();
      let entityName = userDoc.username;
      let entityAvatar = userDoc.avatarUrl;

      if (isTeamEvent) {
        const teamId = userToTeamMap[userDoc._id.toString()];
        if (!teamId) return null;
        const team = teamsMap[teamId];
        entityId = teamId;
        entityName = team.name;
        entityAvatar = null;
      }

      if (!entityScores[entityId]) {
        entityScores[entityId] = {
          _id: entityId,
          username: entityName,
          avatarUrl: entityAvatar,
          score: 0,
          solves: [],
          completedModules: [],
          lastSubmit: new Date(event.startDate || 0)
        };
      }
      return entityScores[entityId];
    };

    submissions.forEach(sub => {
      const entity = getEntity(sub.user);
      if (!entity) return;
      
      entity.score += (sub.awardedPoints || 0);
      entity.solves.push({
        timestamp: sub.timestamp,
        challengeId: { points: sub.awardedPoints || 0 }
      });
      
      if (new Date(sub.timestamp) > new Date(entity.lastSubmit)) {
        entity.lastSubmit = sub.timestamp;
      }
    });

    // Add Module Progress for module-based events
    const eventModules = await Module.find({ eventId: event._id });
    const eventModuleIds = eventModules.map(m => m._id.toString());
    
    if (eventModuleIds.length > 0) {
      const moduleProgresses = await mongoose.model('ModuleProgress').find({ moduleId: { $in: eventModuleIds } }).populate('user', 'username avatarUrl');
      
      moduleProgresses.forEach(prog => {
        const entity = getEntity(prog.user);
        if (!entity) return;
        
        const mod = eventModules.find(m => m._id.toString() === prog.moduleId.toString());
        if (!mod) return;
        
        let earnedPoints = 0;
        let totalDeductions = 0;
        const revealedHints = new Set(prog.revealedHints || []);
        
        mod.pages.forEach(page => {
          if (page.hints) {
            page.hints.forEach(hint => {
              if (revealedHints.has(hint.id)) {
                totalDeductions += (hint.cost || 0);
              }
            });
          }
        });
        if (mod.challenge && mod.challenge.hints) {
          mod.challenge.hints.forEach(hint => {
            if (revealedHints.has(hint.id)) {
              totalDeductions += (hint.cost || 0);
            }
          });
        }

        if (mod.pointsMode === 'page') {
          const completedPages = new Set(prog.completedSectionsDuringEvent || []);
          const completedQuestions = new Set(prog.completedQuestionsDuringEvent || []);
          mod.pages.forEach(page => {
            if (completedPages.has(page.id)) {
              earnedPoints += (page.points || 0);
            }
            if (page.questions && page.questions.length > 0) {
              page.questions.forEach(q => {
                if (completedQuestions.has(q.id)) {
                  earnedPoints += (q.points || 0);
                }
              });
            }
          });
          earnedPoints = Math.max(0, earnedPoints - totalDeductions);
        } else {
          if (prog.isCompletedDuringEvent) {
            earnedPoints = Math.max(0, (mod.points || 0) - totalDeductions);
          }
        }
        
        if (prog.isCompletedDuringEvent) {
           const scheduleDate = mod.scheduledFor ? new Date(mod.scheduledFor) : new Date(mod.createdAt);
           const completionDate = new Date(prog.lastActivityAt || new Date());
           
           const releaseDay = scheduleDate.toISOString().split('T')[0];
           const completionDay = completionDate.toISOString().split('T')[0];
           if (releaseDay === completionDay) {
              earnedPoints += 5;
           }
        }
        
        if (earnedPoints > 0) {
          entity.score += earnedPoints;
          const activityTime = prog.lastActivityAt || prog.updatedAt || new Date();
          entity.completedModules.push({
            timestamp: activityTime,
            points: earnedPoints
          });
          
          if (new Date(activityTime) > new Date(entity.lastSubmit)) {
            entity.lastSubmit = activityTime;
          }
        }
      });
    }

    const leaderboard = Object.values(entityScores).sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(a.lastSubmit) - new Date(b.lastSubmit); // Tie-breaker
    });

    // Assign ranks
    leaderboard.forEach((entry, idx) => {
      entry.rank = idx + 1;
    });

    res.json(leaderboard);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching event leaderboard' });
  }
});

// ── GET /api/events/:id/analytics ────────────────────────────────────────────
router.get('/:id/analytics', protect, isSupervisor, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    // Ensure Supervisor is organizer or Admin
    if (req.user.role === 'Supervisor' && (!event.organizers || !event.organizers.includes(req.user._id))) {
      return res.status(403).json({ message: 'Not an organizer of this event' });
    }

    const participants = await EventRegistration.countDocuments({ eventId: event._id });
    
    // Submissions for this event
    const submissions = await Submission.find({ eventId: event._id }).populate('challenge', 'title points');
    
    const correctSubmissions = submissions.filter(s => s.isCorrect);
    const incorrectSubmissions = submissions.filter(s => !s.isCorrect);

    const analytics = {
      participants,
      totalSolves: correctSubmissions.length,
      failedAttempts: incorrectSubmissions.length,
      solveRate: submissions.length > 0 ? ((correctSubmissions.length / submissions.length) * 100).toFixed(1) + '%' : '0%',
      recentActivity: correctSubmissions.slice(-10).reverse() // Last 10 solves
    };

    res.json(analytics);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching analytics' });
  }
});

// ── GET /api/events/:id/participants ─────────────────────────────────────────
router.get('/:id/participants', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    // Ensure the requester is either registered or an admin/supervisor
    if (req.user.role === 'Member') {
      const reg = await EventRegistration.findOne({ eventId: event._id, userId: req.user._id });
      if (!reg) return res.status(403).json({ message: 'Access denied' });
    }

    const registrations = await EventRegistration.find({ eventId: event._id })
      .populate('userId', 'username avatarUrl')
      .populate('teamId', 'name')
      .sort({ registeredAt: -1 });

    const participants = registrations.map(reg => ({
      _id: reg.userId._id,
      username: reg.userId.username,
      avatarUrl: reg.userId.avatarUrl,
      teamName: reg.teamId ? reg.teamId.name : null,
      registeredAt: reg.registeredAt
    }));

    res.json(participants);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching participants' });
  }
});

// ── GET /api/events/:id/teams ──────────────────────────────────────────────
router.get('/:id/teams', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    // Ensure the requester is either registered or an admin/supervisor
    if (req.user.role === 'Member') {
      const reg = await EventRegistration.findOne({ eventId: event._id, userId: req.user._id });
      if (!reg) return res.status(403).json({ message: 'Access denied' });
    }

    const teams = await Team.find({ eventId: event._id })
      .populate('captain', 'username avatarUrl')
      .populate('members', 'username avatarUrl')
      .sort({ points: -1, createdAt: -1 });

    res.json(teams);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching teams' });
  }
});

// ── POST /api/events/:id/team ────────────────────────────────────────────
// Create or join a team after registering
router.post('/:id/team', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.participationType !== 'team') return res.status(400).json({ message: 'Not a team event' });

    const registration = await EventRegistration.findOne({ eventId: event._id, userId: req.user._id });
    if (!registration) return res.status(403).json({ message: 'You must register for the event first' });
    if (registration.teamId) return res.status(400).json({ message: 'You are already in a team for this event' });

    const { mode, teamName, inviteCode } = req.body;
    let teamId = null;

    if (mode === 'create') {
      if (!teamName) return res.status(400).json({ message: 'Team name is required' });
      const existingTeam = await Team.findOne({ eventId: event._id, name: teamName });
      if (existingTeam) return res.status(400).json({ message: 'Team name already exists in this event' });

      const newInviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const team = new Team({
        name: teamName,
        eventId: event._id,
        captain: req.user._id,
        members: [req.user._id],
        inviteCode: newInviteCode
      });
      await team.save();
      teamId = team._id;
    } else if (mode === 'join') {
      if (!inviteCode) return res.status(400).json({ message: 'Invite code is required' });
      const team = await Team.findOne({ eventId: event._id, inviteCode: inviteCode.toUpperCase() });
      if (!team) return res.status(404).json({ message: 'Invalid invite code' });
      
      if (team.members.length >= event.maxTeamSize) {
        return res.status(400).json({ message: 'Team is full' });
      }
      
      team.members.push(req.user._id);
      await team.save();
      teamId = team._id;
    } else {
      return res.status(400).json({ message: 'Invalid mode' });
    }

    registration.teamId = teamId;
    await registration.save();

    res.status(200).json({ message: 'Successfully joined team' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error handling team' });
  }
});

// ── GET /api/events/:id/participants ─────────────────────────────────────────
router.get('/:id/participants', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    if (req.user.role === 'Member') {
      const reg = await EventRegistration.findOne({ eventId: event._id, userId: req.user._id });
      if (!reg) return res.status(403).json({ message: 'Access denied' });
    }

    const registrations = await EventRegistration.find({ eventId: event._id })
      .populate('userId', 'username avatarUrl')
      .populate('teamId', 'name')
      .sort({ registeredAt: -1 });

    const participants = registrations.map(reg => ({
      _id: reg.userId._id,
      username: reg.userId.username,
      avatarUrl: reg.userId.avatarUrl,
      teamName: reg.teamId ? reg.teamId.name : null,
      registeredAt: reg.registeredAt
    }));

    res.json(participants);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching participants' });
  }
});

// ── GET /api/events/:id/teams ──────────────────────────────────────────────
router.get('/:id/teams', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    if (req.user.role === 'Member') {
      const reg = await EventRegistration.findOne({ eventId: event._id, userId: req.user._id });
      if (!reg) return res.status(403).json({ message: 'Access denied' });
    }

    const teams = await Team.find({ eventId: event._id })
      .populate('captain', 'username avatarUrl')
      .populate('members', 'username avatarUrl')
      .sort({ points: -1, createdAt: -1 });

    res.json(teams);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching teams' });
  }
});

// ── POST /api/events/:id/notifications ───────────────────────────────────────
// @desc    Post a notification specific to this event
// @access  Private (Admins & Supervisors Only)
router.post('/:id/notifications', protect, async (req, res) => {
  try {
    if (!['Admin', 'Supervisor'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to post event notifications' });
    }

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    // Supervisors can only post if they own the event
    if (req.user.role === 'Supervisor' && event.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to post notifications for this event' });
    }

    const { title, message, type, recipients, isPermanent } = req.body;

    const notification = new Notification({
      title,
      message,
      type: type || 'info',
      recipients: recipients || 'all',
      sender: req.user._id,
      isPermanent: !!isPermanent,
      eventId: event._id,
      readBy: [],
    });

    await notification.save();

    res.status(201).json({ message: 'Event notification broadcasted successfully', notification });
  } catch (error) {
    console.error('Error posting event notification:', error);
    res.status(500).json({ message: 'Server error posting event notification' });
  }
});

// ── DELETE /api/events/:id/notifications/:notifId ────────────────────────────
// @desc    Delete an event notification
// @access  Private (Admins & Supervisors Only)
router.delete('/:id/notifications/:notifId', protect, async (req, res) => {
  try {
    if (!['Admin', 'Supervisor'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to delete event notifications' });
    }

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    if (req.user.role === 'Supervisor' && event.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Notification.findByIdAndDelete(req.params.notifId);
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting event notification:', error);
    res.status(500).json({ message: 'Server error deleting notification' });
  }
});

export default router;

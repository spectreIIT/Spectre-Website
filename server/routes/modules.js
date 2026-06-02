import express from 'express';
import ModuleProgress from '../models/ModuleProgress.js';
import Module from '../models/Module.js';
import ActivityLog, { toUTCMidnightFn } from '../models/ActivityLog.js';
import Event from '../models/Event.js';
import EventRegistration from '../models/EventRegistration.js';
import { protect } from '../middleware/authMiddleware.js';
import { recalculateUserScore, recalculateEventScore } from '../utils/scoreHelper.js';

const router = express.Router();

// Helper — check if a module is fully completed by a user
function isModuleComplete(mod, progressMap) {
  const prog = progressMap[mod._id?.toString() || mod.id];
  if (!prog) return false;
  const completed = new Set(prog.completedSections || []);
  return mod.pages.every(p => completed.has(p.id));
}

// Helper - check if event is active and user is participant
async function isEventActiveForUser(moduleId, userId) {
  const mod = await Module.findById(moduleId);
  if (!mod || !mod.eventId) return false;
  const event = await Event.findById(mod.eventId);
  if (!event) return false;
  if (new Date() > new Date(event.endDate)) return false;
  const reg = await EventRegistration.findOne({ eventId: mod.eventId, userId });
  if (!reg) return false;
  return true;
}

// ── GET /api/modules/progress/all ───────────────────────────────
router.get('/progress/all', protect, async (req, res) => {
  try {
    const allProgress = await ModuleProgress.find({ user: req.user._id });
    res.json(allProgress);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching all progress' });
  }
});

// ── GET /api/modules ─────────────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const isPrivileged = req.user.role === 'Admin' || req.user.role === 'Supervisor';

    let query = {};
    if (req.user.role === 'Member') {
      query = {}; // Fetch all to match titles with static overrides securely
    } else if (req.user.role === 'Supervisor') {
      query = {
        $or: [
          { status: { $in: ['active', 'hidden', null, undefined] } },
          { status: 'draft', createdBy: req.user._id }
        ]
      };
    }
    
    if (req.query.eventId) {
      query.eventId = req.query.eventId;
    } else {
      query.eventId = null;
    }

    const modules = await Module.find(query)
      .populate('prerequisites', '_id title icon')
      .populate('createdBy', '_id username')
      .sort({ order: 1, createdAt: 1 });

    // Load all user progress in one query
    const allProgress = await ModuleProgress.find({ user: req.user._id });
    const progressMap = {};
    allProgress.forEach(p => { progressMap[p.moduleId] = p; });

    const enriched = modules.map(mod => {
      const obj = mod.toObject();

      // If user is Member and module is not active, securely strip all data
      if (req.user.role === 'Member' && obj.status && obj.status !== 'active') {
        return {
          _id: obj._id,
          title: obj.title,
          status: obj.status,
          isCompleted: false,
          accessGranted: false,
          canOpen: false,
          canEdit: false
        };
      }

      const prog = progressMap[mod._id.toString()];
      const completedSet = new Set(prog?.completedSections || []);
      const completedQs = new Set(prog?.completedQuestions || []);
      const totalSections = mod.pages ? mod.pages.length : 0;
      const completedCount = mod.pages ? mod.pages.filter(p => completedSet.has(p.id)).length : 0;
      const isModuleDone = totalSections > 0 ? completedCount === totalSections : false;
      const completionPct = totalSections > 0 ? Math.round((completedCount / totalSections) * 100) : 0;
      
      let earnedPoints = 0;
      if (mod.pointsMode === 'page') {
        if (mod.pages) {
          mod.pages.forEach(p => {
            if (completedSet.has(p.id)) earnedPoints += (p.points || 0);
            if (p.questions) {
              p.questions.forEach(q => {
                if (completedQs.has(q.id)) earnedPoints += (q.points || 0);
              });
            }
          });
        }
      } else {
        if (isModuleDone || prog?.isCompleted) earnedPoints = mod.points || 0;
      }

      // Prerequisite check
      const prerequisitesMet = (obj.prerequisites || []).every(pre => {
        const preProg = progressMap[pre._id.toString()];
        if (!preProg) return false;
        return preProg.isCompleted || (preProg.completedSections?.length > 0);
      });

      // Role and Access rules
      const createdById = obj.createdBy?._id?.toString() || obj.createdBy?.toString();
      const isCreator = createdById === req.user._id.toString();

      let canOpen = true;
      let canEdit = true;

      if (req.user.role === 'Supervisor') {
        if (!isCreator) {
          canEdit = false;
        }
      } else if (req.user.role === 'Member') {
        canEdit = false;
        if (obj.status !== 'active') {
          canOpen = false;
        }
      }

      // Sanitize/Strip details of inaccessible hidden modules for supervisors
      let sanitizedPages = obj.pages || [];
      let sanitizedChallenge = obj.challenge || {};

      // Supervisors are allowed to see hidden modules, no page sanitization needed

      return {
        ...obj,
        pages: sanitizedPages,
        challenge: sanitizedChallenge,
        completionPct,
        completedCount,
        earnedPoints,
        totalSections,
        isCompleted: isModuleDone,
        prerequisitesMet,
        accessGranted: isPrivileged || isCreator || (obj.unlocked && prerequisitesMet),
        isVisible: true,
        canOpen,
        canEdit
      };
    });

    res.json(enriched);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching modules' });
  }
});

// ── GET /api/modules/:moduleId ───────────────────────────────────
router.get('/:moduleId', protect, async (req, res) => {
  try {
    if (!req.params.moduleId.match(/^[0-9a-fA-C]{24}$/)) {
      return res.status(404).json({ message: 'Module not found' });
    }
    
    const mod = await Module.findById(req.params.moduleId)
      .populate('prerequisites', '_id title icon')
      .populate('createdBy', '_id username');
      
    if (!mod) return res.status(404).json({ message: 'Module not found' });
    
    // Enforce scoping access controls
    const createdById = mod.createdBy?._id?.toString() || mod.createdBy?.toString();
    const isCreator = createdById === req.user._id.toString();

    if (req.user.role === 'Member' && mod.status && mod.status !== 'active') {
      return res.status(403).json({ message: 'Access Denied: Module is not active' });
    }
    if (req.user.role === 'Supervisor') {
      if (mod.status === 'draft' && !isCreator) {
        return res.status(403).json({ message: 'Access Denied: Draft module belongs to another supervisor' });
      }
    }
    
    res.json(mod);
  } catch (err) {
    console.error('Error fetching module:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── GET /api/modules/:moduleId/progress ─────────────────────────
router.get('/:moduleId/progress', protect, async (req, res) => {
  try {
    const progress = await ModuleProgress.findOne({
      user: req.user._id,
      moduleId: req.params.moduleId
    });
    res.json(progress || { completedSections: [], quizResults: [] });
  } catch (err) {
    console.error('Error fetching progress:', err);
    res.status(500).json({ message: 'Server error fetching progress' });
  }
});

// ── POST /api/modules/:moduleId/progress/section ─────────────────
router.post('/:moduleId/progress/section', protect, async (req, res) => {
  try {
    const { sectionId } = req.body; // Can be a page ID string
    if (!sectionId) return res.status(400).json({ message: 'sectionId/pageId required' });

    const mod = await Module.findById(req.params.moduleId);
    if (!mod) return res.status(404).json({ message: 'Module not found' });

    if (mod.eventId) {
      const event = await Event.findById(mod.eventId);
      if (event && new Date() > new Date(event.endDate)) {
        const progress = await ModuleProgress.findOne({ user: req.user._id, moduleId: req.params.moduleId });
        const alreadyRead = progress && progress.completedSections?.includes(sectionId);
        if (!alreadyRead) {
          return res.status(403).json({ message: 'Event has concluded. Please complete this module in the Global Modules tab.' });
        }
      }
    }

    const eventActive = await isEventActiveForUser(req.params.moduleId, req.user._id);
    const progress = await ModuleProgress.findOne({ user: req.user._id, moduleId: req.params.moduleId });
    let newlyAdded = false;
    if (progress) {
       if (!progress.completedSections.includes(sectionId)) {
          progress.completedSections.push(sectionId);
          if (eventActive && !progress.completedSectionsDuringEvent.includes(sectionId)) {
            progress.completedSectionsDuringEvent.push(sectionId);
          }
          progress.lastActivityAt = new Date();
          newlyAdded = true;
       }
    } else {
       const newProg = new ModuleProgress({
          user: req.user._id,
          moduleId: req.params.moduleId,
          completedSections: [sectionId],
          completedSectionsDuringEvent: eventActive ? [sectionId] : []
       });
       await newProg.save();
       newlyAdded = true;
    }

    const currentProg = progress || await ModuleProgress.findOne({ user: req.user._id, moduleId: req.params.moduleId });

    // Automatically check if all pages in the module are read/solved, and mark module as completed
    if (mod) {
      const completedSet = new Set(currentProg.completedSections || []);
      const allCompleted = mod.pages.every(p => completedSet.has(p.id));
      
      let triggerRecalc = false;

      if (allCompleted && !currentProg.isCompleted) {
        currentProg.isCompleted = true;
        if (eventActive) currentProg.isCompletedDuringEvent = true;
        triggerRecalc = true;
      }

      if (newlyAdded && mod.pointsMode === 'page') {
        triggerRecalc = true;
      }

      await currentProg.save();

      if (triggerRecalc) {
        await recalculateUserScore(req.user._id);
        if (mod.eventId) {
          await recalculateEventScore(mod.eventId, req.user._id);
        }
      }
    }

    // Log activity
    try {
      await ActivityLog.updateOne(
        { userId: req.user._id, type: 'module', date: toUTCMidnightFn() },
        { $setOnInsert: { userId: req.user._id, type: 'module', date: toUTCMidnightFn() } },
        { upsert: true }
      );
      const io = req.app.get('io');
      if (io) {
        io.to(`activity:${req.user._id}`).emit('heatmap:update', { type: 'module' });
      }
    } catch (err) {
      console.error('Error logging module activity:', err);
    }

    res.json(currentProg);
  } catch (err) {
    res.status(500).json({ message: 'Server error saving section progress' });
  }
});

// ── POST /api/modules/:moduleId/challenge/submit ─────────────────
// (Deprecated: left for API compatibility but behaves as page-level verification)
router.post('/:moduleId/challenge/submit', protect, async (req, res) => {
  res.status(410).json({ message: 'Final challenge has been removed. Please submit flags directly inside individual practice labs.' });
});

// ── POST /api/modules/:moduleId/challenge/:pageId/submit ──────────
router.post('/:moduleId/challenge/:pageId/submit', protect, async (req, res) => {
  try {
    const { flag, answer, questionId } = req.body;
    const submittedAnswer = flag || answer; // Backward compatible
    if (!submittedAnswer) return res.status(400).json({ message: 'Answer is required' });

    const mod = await Module.findById(req.params.moduleId);
    if (!mod) return res.status(404).json({ message: 'Module not found' });

    // Find the specific page/challenge
    const page = mod.pages.find(p => p.id === req.params.pageId);
    if (!page) {
      return res.status(404).json({ message: 'Page not found in this module' });
    }

    if (mod.eventId) {
      const event = await Event.findById(mod.eventId);
      if (event && new Date() > new Date(event.endDate)) {
        const progress = await ModuleProgress.findOne({ user: req.user._id, moduleId: req.params.moduleId });
        let alreadySolved = false;
        if (progress) {
          if (questionId) {
            alreadySolved = progress.completedQuestions?.includes(questionId);
          } else {
            alreadySolved = progress.completedSections?.includes(req.params.pageId);
          }
        }
        if (!alreadySolved) {
           return res.status(403).json({ message: 'Event has concluded. Please solve this module in the Global Modules tab.' });
        }
      }
    }

    let isCorrect = false;
    let isQuestionLevel = false;

    if (questionId) {
      // Multiple question logic
      const question = page.questions?.find(q => q.id === questionId);
      if (!question) return res.status(404).json({ message: 'Question not found' });
      
      if (submittedAnswer.trim() !== question.answer.trim()) {
        return res.status(400).json({ message: 'Incorrect answer' });
      }
      isCorrect = true;
      isQuestionLevel = true;
    } else {
      // Legacy single flag logic
      if (page.type !== 'challenge') {
        return res.status(404).json({ message: 'Challenge not found in this module' });
      }
      if (!page.flag) return res.status(400).json({ message: 'This page has no legacy flag' });
      if (submittedAnswer.trim() !== page.flag.trim()) {
        return res.status(400).json({ message: 'Incorrect flag' });
      }
      isCorrect = true;
    }

    const eventActive = await isEventActiveForUser(req.params.moduleId, req.user._id);

    // Using findOneAndUpdate to pull the existing document
    let progress = await ModuleProgress.findOne({ user: req.user._id, moduleId: req.params.moduleId });
    if (!progress) {
       progress = new ModuleProgress({ user: req.user._id, moduleId: req.params.moduleId, completedSections: [], completedQuestions: [], completedSectionsDuringEvent: [], completedQuestionsDuringEvent: [] });
    }

    let newlyCompletedPage = false;

    if (isQuestionLevel) {
       if (!progress.completedQuestions) progress.completedQuestions = [];
       if (!progress.completedQuestionsDuringEvent) progress.completedQuestionsDuringEvent = [];
       if (!progress.completedQuestions.includes(questionId)) {
          progress.completedQuestions.push(questionId);
          if (eventActive && !progress.completedQuestionsDuringEvent.includes(questionId)) {
            progress.completedQuestionsDuringEvent.push(questionId);
          }
       }
       // Check if all questions on page are answered
       const allQIds = page.questions.map(q => q.id);
       const completedQs = new Set(progress.completedQuestions);
       const allPageQsAnswered = allQIds.every(id => completedQs.has(id));
       
       if (allPageQsAnswered && !progress.completedSections.includes(page.id)) {
           progress.completedSections.push(page.id);
           if (eventActive && !progress.completedSectionsDuringEvent.includes(page.id)) {
             progress.completedSectionsDuringEvent.push(page.id);
           }
           newlyCompletedPage = true;
       }
    } else {
       if (!progress.completedSections.includes(page.id)) {
           progress.completedSections.push(page.id);
           if (eventActive && !progress.completedSectionsDuringEvent.includes(page.id)) {
             progress.completedSectionsDuringEvent.push(page.id);
           }
           newlyCompletedPage = true;
       }
    }
    
    // Add user to page solves list if legacy single flag (backward compatible)
    if (!isQuestionLevel && newlyCompletedPage) {
        const hasSolved = page.solves?.some(uid => uid.toString() === req.user._id.toString());
        if (!hasSolved) {
          page.solves = page.solves || [];
          page.solves.push(req.user._id);
          await mod.save();
        }
    }

    // Check if the entire module is completed (all pages in mod.pages are in completedSections)
    const completedSet = new Set(progress.completedSections || []);
    const allCompleted = mod.pages.every(p => completedSet.has(p.id));

    if (allCompleted && !progress.isCompleted) {
      progress.isCompleted = true;
      if (eventActive) progress.isCompletedDuringEvent = true;
    }

    progress.lastActivityAt = new Date();
    await progress.save();
    
    // Always recalculate because pointsMode='page' might award points per question or page
    await recalculateUserScore(req.user._id);
    if (mod.eventId) {
      await recalculateEventScore(mod.eventId, req.user._id);
    }

    // Log activity
    try {
      await ActivityLog.updateOne(
        { userId: req.user._id, type: 'module', date: toUTCMidnightFn() },
        { $setOnInsert: { userId: req.user._id, type: 'module', date: toUTCMidnightFn() } },
        { upsert: true }
      );
    } catch (_) {}

    res.json({ message: isQuestionLevel ? 'Correct answer!' : 'Correct flag! Lab solved.', progress, isModuleCompleted: progress.isCompleted });
  } catch (err) {
    console.error('Error submitting answer:', err);
    res.status(500).json({ message: 'Server error validating answer' });
  }
});

// ── POST /api/modules/:moduleId/complete ────────────────────────
router.post('/:moduleId/complete', protect, async (req, res) => {
  try {
    const mod = await Module.findById(req.params.moduleId);
    if (!mod) return res.status(404).json({ message: 'Module not found' });

    if (mod.eventId) {
      const event = await Event.findById(mod.eventId);
      if (event && new Date() > new Date(event.endDate)) {
         const progress = await ModuleProgress.findOne({ user: req.user._id, moduleId: req.params.moduleId });
         if (!progress || !progress.isCompleted) {
            return res.status(403).json({ message: 'Event has concluded. Please complete this module in the Global Modules tab.' });
         }
      }
    }

    const eventActive = await isEventActiveForUser(req.params.moduleId, req.user._id);

    // Mark complete
    const updateObj = { isCompleted: true, lastActivityAt: new Date() };
    if (eventActive) updateObj.isCompletedDuringEvent = true;

    const progress = await ModuleProgress.findOneAndUpdate(
      { user: req.user._id, moduleId: req.params.moduleId },
      { $set: updateObj },
      { upsert: true, new: true }
    );

    await recalculateUserScore(req.user._id);
    if (mod.eventId) {
      await recalculateEventScore(mod.eventId, req.user._id);
    }

    // Log activity
    try {
      await ActivityLog.updateOne(
        { userId: req.user._id, type: 'module', date: toUTCMidnightFn() },
        { $setOnInsert: { userId: req.user._id, type: 'module', date: toUTCMidnightFn() } },
        { upsert: true }
      );
    } catch (err) {
      console.error('Error logging module completion:', err);
    }

    res.json({ message: 'Module completed successfully.', progress });
  } catch (err) {
    console.error('Error completing module:', err);
    res.status(500).json({ message: 'Server error marking module complete' });
  }
});

export default router;

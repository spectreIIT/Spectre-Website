import mongoose from 'mongoose';
import User from '../models/User.js';
import ModuleProgress from '../models/ModuleProgress.js';
import Module from '../models/Module.js';
import Challenge from '../models/Challenge.js';
import Writeup from '../models/Writeup.js';
import EventRegistration from '../models/EventRegistration.js';
import Team from '../models/Team.js';
import UserXpHistory from '../models/UserXpHistory.js';
import ActivityLog from '../models/ActivityLog.js';
import Event from '../models/Event.js';

const STATIC_MODULE_POINTS = {
  '1': 100,
  '2': 100,
  '3': 100,
  '4': 100,
  '5': 100
};

/**
 * Recalculates and saves the unified score for a given user.
 * Sums up points from solved challenges and completed modules.
 * @param {string|ObjectId} userId - The user ID to update
 * @returns {Promise<number>} The updated score
 */
export const recalculateUserScore = async (userId) => {
  try {
    const user = await User.findById(userId).populate('solves.challengeId');
    if (!user) return 0;

    // 1. Recalculate challenge score
    // We filter validSolves for global scoring, but we MUST NOT overwrite user.solves
    // because user.solves is used to track event solves too!
    const globalSolves = user.solves.filter(solve => solve.challengeId && typeof solve.challengeId === 'object' && solve.challengeId.points !== undefined && !solve.challengeId.eventId);
    
    // Check for dangling references (deleted challenges) - this is the only case we should remove from array
    const validSolvesArray = user.solves.filter(solve => solve.challengeId && typeof solve.challengeId === 'object');
    if (validSolvesArray.length !== user.solves.length) {
      user.solves = validSolvesArray;
    }
    
    const challengeScore = globalSolves.reduce((total, solve) => {
      const pts = solve.awardedPointsAtSolveTime !== undefined 
        ? solve.awardedPointsAtSolveTime 
        : (solve.challengeId.points || 0);
      return total + pts;
    }, 0);

    // 2. Recalculate module score
    const allProgress = await ModuleProgress.find({ user: userId });
    const progressModuleIds = allProgress.map(p => p.moduleId);

    // Filter out static module IDs (e.g. '1', '2') and only query database modules
    const dbModuleIds = progressModuleIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    const dbModules = await Module.find({ _id: { $in: dbModuleIds }, eventId: null });
    
    let dbModuleScore = 0;
    
    allProgress.forEach(prog => {
      const mod = dbModules.find(m => m._id.toString() === prog.moduleId);
      if (mod) {

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
          let pagePoints = 0;
          const completedPages = new Set(prog.completedSections || []);
          const completedQuestions = new Set(prog.completedQuestions || []);
          
          mod.pages.forEach(page => {
            // Give points for completing the page itself
            if (completedPages.has(page.id)) {
              pagePoints += (page.points || 0);
            }
            // Give points for answering questions on the page
            if (page.questions && page.questions.length > 0) {
              page.questions.forEach(q => {
                if (completedQuestions.has(q.id)) {
                  pagePoints += (q.points || 0);
                }
              });
            }
          });
          dbModuleScore += Math.max(0, pagePoints - totalDeductions);
        } else {
          // 'module' mode
          if (prog.isCompleted) {
            dbModuleScore += Math.max(0, (mod.points || 0) - totalDeductions);
          }
        }
        
        if (prog.legacyEventBonus) {
          dbModuleScore += prog.legacyEventBonus;
        }
      }
    });

    // Sum points from completed static modules
    let staticModuleScore = 0;
    allProgress.forEach(prog => {
      if (prog.isCompleted && STATIC_MODULE_POINTS[prog.moduleId]) {
        staticModuleScore += STATIC_MODULE_POINTS[prog.moduleId];
      }
    });

    // 3. Recalculate writeup score
    const approvedWriteups = await Writeup.find({
      author: userId,
      status: { $in: ['approved', 'published'] },
      eventId: null
    });
    const writeupScore = approvedWriteups.reduce((total, w) => total + (w.pointsAwarded || 0), 0);

    // 4. Recalculate daily login score
    const loginDaysCount = await ActivityLog.countDocuments({ userId: userId, type: 'login' });
    const loginScore = loginDaysCount * 2;

    // 5. Recalculate event completion bonus (+10 points per fully completed event)
    let eventCompletionBonus = 0;
    
    // Find all events the user registered for
    const eventRegistrations = await EventRegistration.find({ userId }).populate('eventId');
    
    for (const reg of eventRegistrations) {
      if (!reg.eventId) continue;
      const event = reg.eventId;
      
      const eventChallenges = await Challenge.find({ eventId: event._id });
      const eventModulesDb = await Module.find({ eventId: event._id });
      
      const totalItems = eventChallenges.length + eventModulesDb.length;
      if (totalItems === 0) continue; // Skip empty events
      
      let completedAll = true;
      
      // Check challenges
      for (const c of eventChallenges) {
        // Find solve for this challenge
        const solve = user.solves.find(s => 
          s.challengeId && 
          (s.challengeId._id ? s.challengeId._id.toString() === c._id.toString() : s.challengeId.toString() === c._id.toString())
        );
        
        if (!solve || new Date(solve.solvedAt) > new Date(event.endDate)) {
          completedAll = false;
          break;
        }
      }
      
      if (!completedAll) continue;
      
      // Check modules
      for (const m of eventModulesDb) {
        const prog = allProgress.find(p => p.moduleId === m._id.toString());
        if (!prog || !prog.isCompletedDuringEvent) {
          completedAll = false;
          break;
        }
      }
      
      if (completedAll) {
        eventCompletionBonus += 10;
      }
    }

    // 6. Update user score
    user.score = challengeScore + dbModuleScore + staticModuleScore + writeupScore + loginScore + eventCompletionBonus;
    await user.save();
    
    // 5. Store snapshot in UserXpHistory
    const totalModulesCompleted = allProgress.filter(p => p.isCompleted).length;
    await UserXpHistory.create({
      userId: user._id,
      totalXP: user.score,
      totalChallengesSolved: user.solveCount || 0,
      totalModulesCompleted
    });

    return user.score;
  } catch (error) {
    console.error(`Error recalculating score for user ${userId}:`, error);
    return 0;
  }
};

/**
 * Recalculates and saves the score for a user in a specific event.
 * @param {string|ObjectId} eventId - The event ID
 * @param {string|ObjectId} userId - The user ID
 * @returns {Promise<number>} The updated event score
 */
export const recalculateEventScore = async (eventId, userId) => {
  try {
    const user = await User.findById(userId).populate('solves.challengeId');
    const event = await Event.findById(eventId);
    if (!user || !event) return 0;

    // 1. Recalculate event challenge score
    const eventSolves = user.solves.filter(solve => 
      solve.challengeId && 
      typeof solve.challengeId === 'object' && 
      solve.challengeId.eventId && 
      solve.challengeId.eventId.toString() === eventId.toString()
    );
    
    const challengeScore = eventSolves.reduce((total, solve) => total + (solve.challengeId.points || 0), 0);

    // 2. Recalculate event module score
    const allProgress = await ModuleProgress.find({ user: userId });
    const progressModuleIds = allProgress.map(p => p.moduleId);
    const dbModuleIds = progressModuleIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    const dbModules = await Module.find({ _id: { $in: dbModuleIds }, eventId: eventId });
    
    let dbModuleScore = 0;
    const bonusDays = new Set();
    
    allProgress.forEach(prog => {
      const mod = dbModules.find(m => m._id.toString() === prog.moduleId);
      if (mod) {
        let moduleFullyCompleted = false;

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

        if (mod.pointsMode === 'page') {
          let pagePoints = 0;
          const completedPages = new Set(prog.completedSectionsDuringEvent || []);
          const completedQuestions = new Set(prog.completedQuestionsDuringEvent || []);
          mod.pages.forEach(page => {
            if (completedPages.has(page.id)) {
              pagePoints += (page.points || 0);
            }
            if (page.questions && page.questions.length > 0) {
              page.questions.forEach(q => {
                if (completedQuestions.has(q.id)) {
                  pagePoints += (q.points || 0);
                }
              });
            }
          });
          dbModuleScore += Math.max(0, pagePoints - totalDeductions);
          if (prog.isCompletedDuringEvent) {
             moduleFullyCompleted = true;
          }
        } else {
          if (prog.isCompletedDuringEvent) {
            dbModuleScore += Math.max(0, (mod.points || 0) - totalDeductions);
            moduleFullyCompleted = true;
          }
        }

        if (event.eventType === 'module' && moduleFullyCompleted) {
           const releaseDay = new Date(mod.createdAt).toISOString().split('T')[0];
           const completionDay = new Date(prog.lastActivityAt || new Date()).toISOString().split('T')[0];
           if (releaseDay === completionDay) {
              bonusDays.add(releaseDay);
           }
        }
      }
    });

    if (event.eventType === 'module') {
      dbModuleScore += bonusDays.size * 5;
    }

    // 3. Recalculate event writeup score
    const approvedWriteups = await Writeup.find({
      author: userId,
      status: { $in: ['approved', 'published'] },
      eventId: eventId
    });
    const writeupScore = approvedWriteups.reduce((total, w) => total + (w.pointsAwarded || 0), 0);

    const totalEventScore = challengeScore + dbModuleScore + writeupScore;

    // 4. Update EventRegistration
    const registration = await EventRegistration.findOneAndUpdate(
      { eventId, userId },
      { $set: { score: totalEventScore } },
      { new: true }
    );

    // 5. Update Team score if part of a team
    if (registration && registration.teamId) {
      const team = await Team.findById(registration.teamId);
      if (team) {
        const teamMembers = await EventRegistration.find({ teamId: team._id });
        const teamScore = teamMembers.reduce((sum, member) => sum + (member.score || 0), 0);
        team.points = teamScore;
        await team.save();
      }
    }

    return totalEventScore;
  } catch (error) {
    console.error(`Error recalculating event score for user ${userId} in event ${eventId}:`, error);
    return 0;
  }
};

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import User from './models/User.js';
import ModuleProgress from './models/ModuleProgress.js';
import Module from './models/Module.js';

async function run() {
  await mongoose.connect(process.env.MONGO_URI, {});
  
  const u = await User.findOne({ username: 'Just_checking' });

  const query = {};
  const modules = await Module.find(query);

  const allProgress = await ModuleProgress.find({ user: u._id });
  const progressMap = {};
  allProgress.forEach(p => { progressMap[p.moduleId] = p; });

  const enriched = modules.map(mod => {
      const obj = mod.toObject();
      const prog = progressMap[mod._id.toString()];
      const completedSet = new Set(prog?.completedSections || []);
      const completedQs = new Set(prog?.completedQuestions || []);
      const totalSections = mod.pages ? mod.pages.length : 0;
      const completedCount = mod.pages ? mod.pages.filter(p => completedSet.has(p.id)).length : 0;
      const isModuleDone = totalSections > 0 ? completedCount === totalSections : false;
      
      let earnedPoints = 0;
      let totalDeductions = 0;
      const revealedHints = new Set(prog?.revealedHints || []);
      
      if (mod.pages) {
        mod.pages.forEach(p => {
          if (p.hints) {
            p.hints.forEach(h => {
              if (revealedHints.has(h.id)) totalDeductions += (h.cost || 0);
            });
          }
        });
      }
      if (mod.challenge && mod.challenge.hints) {
        mod.challenge.hints.forEach(h => {
          if (revealedHints.has(h.id)) totalDeductions += (h.cost || 0);
        });
      }

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
        earnedPoints = Math.max(0, earnedPoints - totalDeductions);
      } else {
        if (isModuleDone || prog?.isCompleted) {
          earnedPoints = Math.max(0, (mod.points || 0) - totalDeductions);
        }
      }

      return { title: mod.title, points: mod.points, earnedPoints, totalDeductions, isCompleted: isModuleDone || prog?.isCompleted };
  });

  const target = enriched.find(e => e.title === 'dhgyj');
  console.log(target);

  await mongoose.disconnect();
}

run().catch(console.error);

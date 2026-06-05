import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import User from './models/User.js';
import ModuleProgress from './models/ModuleProgress.js';
import Module from './models/Module.js';
import { recalculateUserScore } from './utils/scoreHelper.js';

// Mock request/response
const mockReq = (user, params, body) => ({ user, params, body });
const mockRes = () => {
  const res = {};
  res.status = () => res;
  res.json = (data) => { res.data = data; return res; };
  return res;
};

async function run() {
  await mongoose.connect(process.env.MONGO_URI, {});
  
  const user = new User({
    username: 'test_full_' + Date.now(),
    email: `test_full_${Date.now()}@test.com`,
    password: 'password123',
    role: 'Member'
  });
  await user.save();

  const mod = new Module({
    title: 'Test Inline Lab',
    description: 'Test',
    pointsMode: 'module',
    points: 100,
    status: 'active',
    pages: [{
       id: 'page1',
       title: 'Page 1',
       type: 'challenge',
       content: 'Test content {{HINT: hint1}}',
       flag: 'secretflag',
       hints: [{ id: 'hint1', text: 'secret', cost: 30 }]
    }],
    createdBy: user._id
  });
  await mod.save();

  // Create progress
  const prog = new ModuleProgress({
    user: user._id,
    moduleId: mod._id.toString(),
    completedSections: []
  });
  await prog.save();

  // SIMULATE /reveal
  const hintId = 'hint1';
  if (!prog.revealedHints.includes(hintId)) {
    prog.revealedHints.push(hintId);
    await prog.save();
    await recalculateUserScore(user._id);
  }

  // SIMULATE /submit
  const page = mod.pages[0];
  if (!prog.completedSections.includes(page.id)) {
    prog.completedSections.push(page.id);
  }
  const completedSet = new Set(prog.completedSections || []);
  const allCompleted = mod.pages.every(p => completedSet.has(p.id));
  if (allCompleted && !prog.isCompleted) {
    prog.isCompleted = true;
  }
  await prog.save();
  await recalculateUserScore(user._id);

  const updatedUser = await User.findById(user._id);
  console.log(`Final User Score: ${updatedUser.score}`);

  // Cleanup
  await User.deleteOne({ _id: user._id });
  await Module.deleteOne({ _id: mod._id });
  await ModuleProgress.deleteOne({ _id: prog._id });
  await mongoose.disconnect();
}

run().catch(console.error);

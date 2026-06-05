import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import User from './models/User.js';
import ModuleProgress from './models/ModuleProgress.js';
import Module from './models/Module.js';
import { recalculateUserScore } from './utils/scoreHelper.js';

async function run() {
  await mongoose.connect(process.env.MONGO_URI, {});
  console.log("Connected to DB");

  const user = new User({
    username: 'test_score_user_' + Date.now(),
    email: `test_${Date.now()}@test.com`,
    password: 'password123',
    role: 'Member'
  });
  await user.save();

  // Create a dummy module with final lab hints
  const mod = new Module({
    title: 'Test Module Final Lab',
    description: 'Test',
    pointsMode: 'module',
    points: 100,
    status: 'active',
    pages: [{
       id: 'page1',
       title: 'Page 1',
       content: 'Test content'
    }],
    challenge: {
       hints: [{ id: 'hint1', text: 'secret', cost: 30 }]
    },
    createdBy: user._id
  });
  await mod.save();

  // Refetch to see if hint was saved
  const savedMod = await Module.findById(mod._id);
  console.log("Did Mongoose save challenge hints?", !!(savedMod.challenge && savedMod.challenge.hints && savedMod.challenge.hints.length > 0));

  // Create fake progress
  const prog = new ModuleProgress({
    user: user._id,
    moduleId: mod._id.toString(),
    isCompleted: true,
    completedSections: [],
    revealedHints: ['hint1']
  });
  await prog.save();

  const score = await recalculateUserScore(user._id);
  console.log(`Calculated Score: ${score}`);

  // Cleanup
  await User.deleteOne({ _id: user._id });
  await Module.deleteOne({ _id: mod._id });
  await ModuleProgress.deleteOne({ _id: prog._id });
  await mongoose.disconnect();
}

run().catch(console.error);

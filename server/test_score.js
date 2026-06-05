import mongoose from 'mongoose';
import User from './models/User.js';
import ModuleProgress from './models/ModuleProgress.js';
import Module from './models/Module.js';

await mongoose.connect('mongodb://127.0.0.1:27017/spectre-ctf', {});

import { recalculateUserScore } from './utils/scoreHelper.js';

async function run() {
  const users = await User.find().limit(1);
  if (users.length === 0) {
    console.log("No users");
    return;
  }
  const user = users[0];
  console.log(`Initial User Score: ${user.score}`);
  
  // Create a fake module
  const mod = new Module({
    title: 'Test Deductions',
    description: 'Test',
    pointsMode: 'module',
    points: 100,
    status: 'active',
    pages: [{
      id: 'page1',
      title: 'Page 1',
      hints: [{ id: 'hint1', text: 'secret', cost: 30 }]
    }],
    createdBy: user._id
  });
  await mod.save();
  
  // Create fake progress
  const prog = new ModuleProgress({
    user: user._id,
    moduleId: mod._id.toString(),
    isCompleted: true,
    completedSections: ['page1'],
    revealedHints: ['hint1']
  });
  await prog.save();
  
  const score = await recalculateUserScore(user._id);
  console.log(`Calculated Score: ${score}`);
  
  // Cleanup
  await Module.deleteOne({ _id: mod._id });
  await ModuleProgress.deleteOne({ _id: prog._id });
}

run()
  .catch(console.error)
  .finally(() => mongoose.disconnect());

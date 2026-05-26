import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

import User from '../models/User.js';
import { recalculateUserScore } from '../utils/scoreHelper.js';

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected');

    const users = await User.find({});
    console.log(`Found ${users.length} users. Recalculating...`);

    let updatedCount = 0;
    for (const user of users) {
      const oldScore = user.score;
      const oldSolves = user.solves.length;
      
      const newScore = await recalculateUserScore(user._id);
      
      const updatedUser = await User.findById(user._id);
      
      console.log(`User ${user.username}: Score ${oldScore} -> ${newScore}, Solves ${oldSolves} -> ${updatedUser.solves.length}`);
      updatedCount++;
    }

    console.log(`Successfully recalculated ${updatedCount} users.`);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

run();

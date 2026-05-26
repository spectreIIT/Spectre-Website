import mongoose from 'mongoose';

const userXpHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  totalXP: {
    type: Number,
    required: true,
    default: 0
  },
  totalChallengesSolved: {
    type: Number,
    default: 0
  },
  totalModulesCompleted: {
    type: Number,
    default: 0
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

const UserXpHistory = mongoose.model('UserXpHistory', userXpHistorySchema);
export default UserXpHistory;

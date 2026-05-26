import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  challenge: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Challenge',
    required: true
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    default: null
  },
  flagSubmitted: {
    type: String,
    required: true
  },
  isCorrect: {
    type: Boolean,
    required: true
  },
  isPractice: {
    type: Boolean,
    default: false
  },
  attemptsBeforeSolve: {
    type: Number,
    default: 0
  },
  hintsUsed: [{
    type: Number
  }],
  awardedPoints: {
    type: Number
  },
  challengePointsBeforeSolve: {
    type: Number
  },
  challengePointsAfterSolve: {
    type: Number
  },
  rank: {
    type: Number
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const Submission = mongoose.model('Submission', submissionSchema);
export default Submission;

import mongoose from 'mongoose';

const challengeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  category: { type: String, default: 'Web' },
  difficulty: { type: String, default: 'Easy' },
  points: { type: Number, default: 100 },
  author: { type: String, default: 'Admin' },
  solves: { type: Number, default: 0 },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  hints: [{
    text: String,
    cost: { type: Number, default: 0 }
  }],
  files: [{
    name: String,
    url: String,
    size: String,
    type: { type: String, default: 'file' }
  }],
  flag: { type: String },
  flagType: { type: String, enum: ['static', 'regex'], default: 'static' },
  caseSensitive: { type: Boolean, default: true },
  maxAttempts: { type: Number, default: 0 }, // 0 means infinite attempts
  isInstance: { type: Boolean, default: false },
  instanceUrl: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null },
  status: { type: String, enum: ['draft', 'active', 'hidden'], default: 'draft' },
  scoringType: { type: String, enum: ['static', 'dynamic'], default: 'static' },
  initialPoints: { type: Number, default: 100 },
  minimumPoints: { type: Number, default: 50 },
  currentPoints: { type: Number, default: 100 },
  decayFactor: { type: Number, default: 5 },
  decayType: { type: String, enum: ['linear', 'logarithmic', 'exponential'], default: 'linear' },
  walkthroughUrl: { type: String, default: '' },
  tags: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

challengeSchema.pre('validate', function(next) {
  if (this.status === 'active' || this.status === 'hidden') {
    if (!this.description) {
      this.invalidate('description', 'Description is required for live/hidden challenges');
    }
    if (!this.category) {
      this.invalidate('category', 'Category is required for live/hidden challenges');
    }
    if (!this.difficulty) {
      this.invalidate('difficulty', 'Difficulty is required for live/hidden challenges');
    }
    if (this.points === undefined || this.points === null) {
      this.invalidate('points', 'Points value is required for live/hidden challenges');
    }
    if (!this.flag) {
      this.invalidate('flag', 'Flag is required for live/hidden challenges');
    }
  }
  next();
});

challengeSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('points')) {
    if (!this.initialPoints || this.initialPoints === 100) {
      this.initialPoints = this.points;
    }
    if (!this.currentPoints || this.currentPoints === 100) {
      this.currentPoints = this.points;
    }
  }
  next();
});

const Challenge = mongoose.model('Challenge', challengeSchema);
export default Challenge;

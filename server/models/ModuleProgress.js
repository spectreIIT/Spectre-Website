import mongoose from 'mongoose';

const quizResultSchema = new mongoose.Schema({
  sectionId: { type: String, required: true },
  score: { type: Number, required: true },
  total: { type: Number, required: true },
  completedAt: { type: Date, default: Date.now }
}, { _id: false });

const moduleProgressSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  moduleId: {
    type: String,   // matches the static/DB module id
    required: true
  },
  completedSections: [{
    type: String    // section id strings e.g. "s1", "s2"
  }],
  completedSectionsDuringEvent: [{
    type: String
  }],
  completedQuestions: [{
    type: String    // question id strings e.g. "q_123"
  }],
  completedQuestionsDuringEvent: [{
    type: String
  }],
  quizResults: [quizResultSchema],
  isCompleted: {
    type: Boolean,
    default: false
  },
  isCompletedDuringEvent: {
    type: Boolean,
    default: false
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  lastActivityAt: {
    type: Date,
    default: Date.now
  }
});

// Unique per user+module
moduleProgressSchema.index({ user: 1, moduleId: 1 }, { unique: true });

const ModuleProgress = mongoose.model('ModuleProgress', moduleProgressSchema);
export default ModuleProgress;

import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  text: { type: String, required: true },
  answer: { type: String, required: true },
  type: { type: String, enum: ['flag', 'blank'], default: 'flag' },
  points: { type: Number, default: 0 }
}, { _id: false });

const pageSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String, default: '' }, // Markdown formatted content / description
  type: { type: String, enum: ['theory', 'challenge'], default: 'theory' },
  points: { type: Number, default: 0 },
  flag: { type: String, default: '' }, // Legacy, keep for backward compatibility
  questions: [questionSchema],
  files: [
    {
      name: { type: String, required: true },
      url: { type: String, required: true },
      type: { type: String, enum: ['file', 'link'], default: 'file' }
    }
  ],
  solves: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { _id: false });

const fileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String, required: true }
}, { _id: false });

const moduleChallengeSchema = new mongoose.Schema({
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  files: [fileSchema],
  flag: { type: String, default: '' },
  solves: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { _id: false });

const moduleSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  icon: { type: String, default: '📘' },
  color: { type: String, default: '#00f0ff' },
  description: { type: String, default: '' },
  banner: { type: String, default: '' }, // Optional thumbnail/banner URL
  difficulty: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Beginner' },
  category: { type: String, default: 'General' }, // Tags/categories
  status: { type: String, enum: ['draft', 'active', 'hidden'], default: 'draft' },
  unlocked: { type: Boolean, default: true },
  prerequisites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Module'
  }],
  pointsMode: { type: String, enum: ['module', 'page'], default: 'module' },
  points: { type: Number, default: 100 },
  pages: [pageSchema],
  challenge: {
    type: moduleChallengeSchema,
    default: () => ({})
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    default: null
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

moduleSchema.pre('validate', function(next) {
  if (this.status === 'active' || this.status === 'hidden') {
    if (!this.title?.trim()) {
      this.invalidate('title', 'Title is required for live/hidden modules');
    }
    if (!this.description?.trim()) {
      this.invalidate('description', 'Description is required for live/hidden modules');
    }
    if (this.points === undefined || this.points === null || this.points < 0) {
      this.invalidate('points', 'Valid point value is required for live/hidden modules');
    }
    if (!this.pages || this.pages.length === 0) {
      this.invalidate('pages', 'At least one page is required for live/hidden modules');
    } else {
      this.pages.forEach((page, idx) => {
        if (!page.title?.trim()) {
          this.invalidate(`pages.${idx}.title`, 'Page Title is required');
        }
        if (page.type === 'challenge') {
          if (!page.content?.trim()) {
            this.invalidate(`pages.${idx}.content`, `Challenge '${page.title || idx + 1}' Description is required`);
          }
          
          const hasLegacyFlag = !!page.flag?.trim();
          const hasQuestions = page.questions && page.questions.length > 0;
          
          if (!hasLegacyFlag && !hasQuestions) {
            this.invalidate(`pages.${idx}.questions`, `Challenge '${page.title || idx + 1}' requires at least one question or flag`);
          }
          
          if (hasQuestions) {
             page.questions.forEach((q, qIdx) => {
                if (!q.text?.trim()) {
                   this.invalidate(`pages.${idx}.questions.${qIdx}.text`, `Question text is required for '${page.title}'`);
                }
                if (!q.answer?.trim()) {
                   this.invalidate(`pages.${idx}.questions.${qIdx}.answer`, `Question answer is required for '${page.title}'`);
                }
             });
          }
        }
      });
    }
  }
  next();
});

const Module = mongoose.model('Module', moduleSchema);
export default Module;

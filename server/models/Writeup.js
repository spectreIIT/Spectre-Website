import mongoose from 'mongoose';

const writeupSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  draftTitle: {
    type: String,
  },
  description: {
    type: String,
  },
  draftDescription: {
    type: String,
  },
  content: {
    type: String,
    required: true,
  },
  draftContent: {
    type: String,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  challengeName: {
    type: String,
    required: true,
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    default: null
  },
  draftChallengeName: {
    type: String,
  },
  tags: [{
    type: String
  }],
  draftTags: [{
    type: String
  }],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'under_review', 'Draft', 'Pending Review', 'Approved', 'Rejected', 'Published'],
    default: 'pending',
  },
  visibility: {
    type: String,
    enum: ['private', 'public'],
    default: 'private',
  },
  pointsAwarded: {
    type: Number,
    default: 0,
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  reviewRemarks: {
    type: String,
    default: '',
  },
  rejectionReason: {
    type: String,
    default: '',
  },
  isPublished: {
    type: Boolean,
    default: false,
  },
  challengeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Challenge',
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    default: null
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  reviewedAt: {
    type: Date,
  },
  publishedAt: {
    type: Date,
  },
  featured: {
    type: Boolean,
    default: false,
  },
  reviewerHistory: [{
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewerName: String,
    reviewerRole: String,
    action: String, // 'Approved', 'Rejected', 'Re-evaluated', 'Published'
    points: Number,
    remarks: String,
    date: { type: Date, default: Date.now }
  }],
  upvotes: {
    type: Number,
    default: 0
  },
  upvotedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  views: {
    type: Number,
    default: 0
  },
  viewedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, { timestamps: true });

const Writeup = mongoose.model('Writeup', writeupSchema);

export default Writeup;

import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
  description: { type: String, default: '' },
  thumbnail: { type: String, default: '' },
  
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  registrationStart: { type: Date },
  registrationEndType: { type: String, enum: ['specific', 'event_end'], default: 'event_end' },
  registrationEndDate: { type: Date },
  
  // Status and Type
  status: { type: String, enum: ['draft', 'hidden', 'active', 'archived'], default: 'draft' },
  eventType: { type: String, enum: ['ctf', 'module'], required: true, default: 'ctf' },
  
  // Configuration
  maxParticipants: { type: Number, default: 0 }, // 0 means unlimited
  participationType: { type: String, enum: ['solo', 'team'], default: 'solo' },
  maxTeamSize: { type: Number, default: 4 },
  isPublic: { type: Boolean, default: true },
  registrationEnabled: { type: Boolean, default: true },
  
  // Content
  rules: [{
    title: { type: String, required: true },
    content: { type: String, required: true },
    icon: { type: String, default: 'AlertCircle' },
    level: { type: String, enum: ['critical', 'warning', 'info', 'success'], default: 'info' }
  }],
  discordLink: { type: String, default: '' },
  features: [{
    title: { type: String, required: true },
    description: { type: String, required: true }
  }],
  
  // Toggles
  allowWriteups: { type: Boolean, default: false },
  writeupsStart: { type: Date },
  writeupsEnd: { type: Date },
  showLeaderboard: { type: Boolean, default: true },
  freezeLeaderboardAt: { type: Date }, // Optional time to freeze scoreboard
  
  // Relations
  organizers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

}, { timestamps: true });

const Event = mongoose.model('Event', eventSchema);
export default Event;

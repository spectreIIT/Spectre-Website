import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  captain: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  inviteCode: { type: String, required: true, unique: true },
  points: { type: Number, default: 0 }
}, { timestamps: true });

// Ensure a user can only be in one team per event
teamSchema.index({ eventId: 1, 'members': 1 });
// Ensure team names are unique per event
teamSchema.index({ eventId: 1, name: 1 }, { unique: true });

const Team = mongoose.model('Team', teamSchema);
export default Team;

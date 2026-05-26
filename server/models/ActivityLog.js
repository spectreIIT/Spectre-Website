import mongoose from 'mongoose';

// Normalize any date to UTC midnight matching the local calendar date so daily grouping aligns with user's timezone
function toUTCMidnight(d = new Date()) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

const activityLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    required: true,
  },
  // Optional duration in minutes for time-based event participation
  durationMinutes: {
    type: Number,
    default: 0,
  },
  // Optional custom weight multiplier or specific points for event metrics
  customPoints: {
    type: Number,
    default: 0,
  },
  // Optional event metadata / identifier
  eventId: {
    type: String,
    default: '',
  },
  eventName: {
    type: String,
    default: '',
  },
  // Stored as UTC midnight so grouping by date works correctly across timezones
  date: {
    type: Date,
    default: () => toUTCMidnight(),
    index: true,
  },
}, { timestamps: true });

// Compound index for the heatmap query
activityLogSchema.index({ userId: 1, date: 1 });

export const toUTCMidnightFn = toUTCMidnight;
const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
export default ActivityLog;

import mongoose from 'mongoose';

const eventRegistrationSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null
  },
  status: {
    type: String,
    enum: ['registered', 'disqualified', 'withdrawn'],
    default: 'registered'
  },
  registeredAt: {
    type: Date,
    default: Date.now
  },
  // We can track event-specific score here or dynamically compute it
  score: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Ensure a user can only register once per event
eventRegistrationSchema.index({ eventId: 1, userId: 1 }, { unique: true });

const EventRegistration = mongoose.model('EventRegistration', eventRegistrationSchema);
export default EventRegistration;

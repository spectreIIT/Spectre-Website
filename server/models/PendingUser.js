import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const pendingUserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true }, // We'll store it plain here temporarily, it will be hashed when transferred to User model
  verificationOtp: { type: String, required: true }, // Hashed OTP
  otpExpiresAt: { type: Date, required: true }, // Expires in 2 minutes
  createdAt: { type: Date, default: Date.now, expires: 600 } // Document auto-deletes after 10 minutes
});

const PendingUser = mongoose.model('PendingUser', pendingUserSchema);
export default PendingUser;

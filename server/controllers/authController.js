import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import sendEmail from '../utils/sendEmail.js';
import ActivityLog, { toUTCMidnightFn } from '../models/ActivityLog.js';
import PendingUser from '../models/PendingUser.js';

import crypto from 'crypto';

const generateAccessToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'spectre_secret_key', {
    expiresIn: '15m',
  });
};

const generateRefreshToken = () => {
  return crypto.randomBytes(40).toString('hex');
};

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

export const registerUser = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    let userExists = await User.findOne({ $or: [{ email }, { username }] });

    if (userExists) {
      if (!userExists.isVerified) {
        // Clean up legacy garbage data so they can re-register correctly via PendingUser
        await User.findByIdAndDelete(userExists._id);
      } else {
        return res.status(400).json({ message: 'User already exists' });
      }
    }

    const otp = generateOTP();
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, salt);
    const otpExpiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes

    // Upsert pending user (if they try to register again before expiry)
    const pendingUser = await PendingUser.findOneAndUpdate(
      { email },
      { username, email, password, verificationOtp: hashedOtp, otpExpiresAt, createdAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if (pendingUser) {
      // Send Email
      try {
        await sendEmail({
          email: pendingUser.email,
          subject: 'Spectre IIT-Bhilai - Email Verification',
          message: `Your verification code is: ${otp}. It will expire in 10 minutes.`,
        });
        res.status(201).json({ message: 'Registration successful. Please verify your email.' });
      } catch (emailError) {
        // Rollback
        await PendingUser.findByIdAndDelete(pendingUser._id);
        return res.status(500).json({
          message: emailError.message
        });
      }
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const verifyEmail = async (req, res) => {
  const { email, otp } = req.body;

  try {
    // Check if user is already registered and verified
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User is already registered and verified' });
    }

    const pendingUser = await PendingUser.findOne({ email });

    if (!pendingUser) {
      return res.status(400).json({ message: 'Registration session expired. Please register again.' });
    }

    if (pendingUser.otpExpiresAt < Date.now()) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    const isMatch = await bcrypt.compare(otp, pendingUser.verificationOtp);

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // OTP matched, create the actual User
    user = await User.create({
      username: pendingUser.username,
      email: pendingUser.email,
      password: pendingUser.password, // Pre-save hook will hash it
      isVerified: true
    });

    // Delete the pending user record
    await PendingUser.findByIdAndDelete(pendingUser._id);

    // Log the initial login activity and award 2 points
    try {
      const logResult = await ActivityLog.updateOne(
        { userId: user._id, type: 'login', date: toUTCMidnightFn() },
        { $setOnInsert: { userId: user._id, type: 'login', date: toUTCMidnightFn() } },
        { upsert: true }
      );
      if (logResult.upsertedCount > 0) {
        user.score = (user.score || 0) + 2;
        await user.save();
      }
    } catch (err) {
      console.error('Error logging activity:', err);
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken();

    user.refreshTokens.push(refreshToken);
    await user.save();

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 24 * 60 * 60 * 1000 // 1 day default
    });

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      score: user.score,
      token: accessToken,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const resendOtp = async (req, res) => {
  const { email } = req.body;

  try {
    const pendingUser = await PendingUser.findOne({ email });

    if (!pendingUser) {
      return res.status(400).json({ message: 'Session expired. Please register again.' });
    }

    const otp = generateOTP();
    const salt = await bcrypt.genSalt(10);
    pendingUser.verificationOtp = await bcrypt.hash(otp, salt);
    pendingUser.otpExpiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 mins
    await pendingUser.save();

    await sendEmail({
      email: pendingUser.email,
      subject: 'Spectre IIT-Bhilai - Resend Verification',
      message: `Your new verification code is: ${otp}. It will expire in 2 minutes.`,
    });

    res.json({ message: 'A new OTP has been sent to your email.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body; // email can be username or email

  try {
    const user = await User.findOne({
      $or: [{ email: email }, { username: email }]
    });

    if (!user) {
      // Check if they are in PendingUser (unverified)
      const pendingUser = await PendingUser.findOne({
        $or: [{ email: email }, { username: email }]
      });
      if (pendingUser) {
        return res.status(403).json({ message: 'Please verify your email first', requiresVerification: true });
      }
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: 'Please verify your email first', requiresVerification: true });
    }

    // Log the login activity
    try {
      const logResult = await ActivityLog.updateOne(
        { userId: user._id, type: 'login', date: toUTCMidnightFn() },
        { $setOnInsert: { userId: user._id, type: 'login', date: toUTCMidnightFn() } },
        { upsert: true }
      );
      if (logResult.upsertedCount > 0) {
        user.score = (user.score || 0) + 2;
      }
    } catch (err) {
      console.error('Error logging activity:', err);
    }

    const { rememberMe } = req.body;
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken();

    user.refreshTokens.push(refreshToken);
    await user.save();

    const maxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge,
    });

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      score: user.score,
      token: accessToken,
      expiresIn: 15 * 60 // 15 mins
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      // Log the daily visit
      try {
        const logResult = await ActivityLog.updateOne(
          { userId: user._id, type: 'login', date: toUTCMidnightFn() },
          { $setOnInsert: { userId: user._id, type: 'login', date: toUTCMidnightFn() } },
          { upsert: true }
        );
        if (logResult.upsertedCount > 0) {
          user.score = (user.score || 0) + 2;
          await user.save();
        }
        const io = req.app.get('io');
        if (io) io.to(`activity:${user._id}`).emit('heatmap:update', { type: 'login' });
      } catch (err) {
        console.error('Error logging daily visit:', err);
      }

      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        score: user.score,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists or not for security reasons
      return res.status(200).json({ message: 'If the email exists, a reset link was sent.' });
    }

    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const salt = await bcrypt.genSalt(10);
    user.passwordResetToken = await bcrypt.hash(token, salt);
    user.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();

    const origin = req.headers.origin || 'http://localhost:5173';
    const resetLink = `${origin}/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`;

    await sendEmail({
      email: user.email,
      subject: 'Spectre IIT-Bhilai - Password Reset',
      message: `Click the following link to reset your password: <a href="${resetLink}">${resetLink}</a>. It will expire in 10 minutes.`,
    });

    res.status(200).json({ message: 'If the email exists, a reset link was sent.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const resetPassword = async (req, res) => {
  const { email, token, newPassword } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.passwordResetToken || user.passwordResetExpires < Date.now()) {
      return res.status(400).json({ message: 'Reset token is invalid or has expired' });
    }

    const isMatch = await bcrypt.compare(token, user.passwordResetToken);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid token' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = newPassword; // Will be hashed by pre-save hook
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.passwordChangedAt = new Date();
    await user.save();

    // Broadcast force logout to all instances via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(`activity:${user._id}`).emit('auth:force_logout');
    }

    res.json({ message: 'Password reset successful. You can now login.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const refreshToken = async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) {
    return res.status(401).json({ message: 'No refresh token provided' });
  }

  try {
    const user = await User.findOne({ refreshTokens: token });
    if (!user) {
      res.clearCookie('refreshToken');
      return res.status(403).json({ message: 'Invalid refresh token' });
    }

    const accessToken = generateAccessToken(user._id);

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      score: user.score,
      token: accessToken,
      expiresIn: 15 * 60
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during token refresh' });
  }
};

export const logoutUser = async (req, res) => {
  const token = req.cookies.refreshToken;
  if (token) {
    try {
      await User.updateOne(
        { refreshTokens: token },
        { $pull: { refreshTokens: token } }
      );
    } catch (err) {
      console.error(err);
    }
  }
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out successfully' });
};

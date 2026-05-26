import express from 'express';
import { registerUser, loginUser, getMe, verifyEmail, forgotPassword, resetPassword, refreshToken, logoutUser } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/verify-email', verifyEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', protect, getMe);
router.post('/refresh', refreshToken);
router.post('/logout', logoutUser);

export default router;

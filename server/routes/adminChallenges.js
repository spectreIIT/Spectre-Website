import express from 'express';
import { protect, isAdmin } from '../middleware/authMiddleware.js';
import {
  getChallenges,
  createChallenge,
  updateChallenge,
  deleteChallenge,
  getChallengeAnalytics,
  getSolves
} from '../controllers/adminChallengeController.js';

const router = express.Router();

// Middleware to check if user is Admin OR Supervisor
const isAdminOrSupervisor = (req, res, next) => {
  if (req.user && (req.user.role === 'Admin' || req.user.role === 'Supervisor')) {
    next();
  } else {
    res.status(401).json({ message: 'Not authorized as an admin or supervisor' });
  }
};

router.route('/')
  .get(protect, isAdminOrSupervisor, getChallenges)
  .post(protect, isAdminOrSupervisor, createChallenge);

router.route('/:id')
  .put(protect, isAdminOrSupervisor, updateChallenge)
  .delete(protect, isAdminOrSupervisor, deleteChallenge);

router.get('/:id/solves', protect, isAdminOrSupervisor, getSolves);
router.get('/:id/analytics', protect, isAdminOrSupervisor, getChallengeAnalytics);

export default router;

import express from 'express';
import { getAllUsers, getUserById, updateUser, deleteUser } from '../../controllers/userController.js';
import { protect, authorize } from '../middleware/auth.js';
import { ROLES } from '../../config/constants.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Admin only routes
router.get('/', authorize(ROLES.ADMIN), getAllUsers);
router.delete('/:id', authorize(ROLES.ADMIN), deleteUser);

// Authenticated user routes
router.get('/:id', getUserById);
router.put('/:id', updateUser);

export default router;

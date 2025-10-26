import express from 'express';
import { agentCommand, agentConfirm } from './agentController.js';
// import { protect } from '../api/middleware/auth.js';

const router = express.Router();

// router.use(protect); // enable when auth is ready

/**
 * @swagger
 * /api/ai/agent/command:
 *   post:
 *     tags: [AI]
 *     summary: Propose an action (e.g., create purchase order) with confirm-before-execute flow
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [command]
 *             properties:
 *               command:
 *                 type: string
 *                 example: "Order more cookies based on this month"
 *               conversationHistory:
 *                 type: array
 *               createdBy:
 *                 type: string
 *                 description: profiles.id of the requester
 *               supplierId:
 *                 type: string
 *                 description: suppliers.id if known
 *     responses:
 *       200:
 *         description: Proposal or clarification
 */
router.post('/agent/command', agentCommand);

/**
 * @swagger
 * /api/ai/agent/confirm:
 *   post:
 *     tags: [AI]
 *     summary: Confirm or abort a proposed action
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [confirmationId, confirm]
 *             properties:
 *               confirmationId:
 *                 type: string
 *               confirm:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Execution result or aborted
 */
router.post('/agent/confirm', agentConfirm);

export default router;



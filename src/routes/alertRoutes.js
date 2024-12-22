import express from 'express';
import { getAlertById } from '../controllers/alertController.js'; // Import the alert controller

const router = express.Router();

/**
 * @swagger
 * /api/alerts/{alertId}:
 *   get:
 *     summary: Get alert details by alertId
 *     description: Fetch the details of an alert based on the alertId provided.
 *     parameters:
 *       - name: alertId
 *         in: path
 *         required: true
 *         description: The unique identifier of the alert.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully fetched the alert details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 alertId:
 *                   type: string
 *                   description: The unique identifier of the alert
 *                 message:
 *                   type: string
 *                   description: The alert message
 *       404:
 *         description: Alert not found
 *       500:
 *         description: Internal Server Error
 */
router.get('/:alertId', getAlertById);

export default router;

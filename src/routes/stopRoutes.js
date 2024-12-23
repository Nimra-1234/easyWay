import express from 'express';
import { getAllStops, getStopById } from '../controllers/stopController.js';

const router = express.Router();

/**
 * @swagger
 * /api/stops:
 *   get:
 *     summary: Get all stops
 *     description: Retrieve all stops available in the system.
 *     tags:
 *       - Stops
 *     responses:
 *       200:
 *         description: Successfully retrieved all stops
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   stop_id:
 *                     type: string
 *                     description: The unique identifier for the stop.
 *                   stop_code:
 *                     type: string
 *                     description: The code of the stop.
 *                   stop_name:
 *                     type: string
 *                     description: The name of the stop.
 *                   stop_lat:
 *                     type: number
 *                     description: The latitude of the stop.
 *                   stop_lon:
 *                     type: number
 *                     description: The longitude of the stop.
 *       500:
 *         description: Internal Server Error
 */
router.get('/', getAllStops);

/**
 * @swagger
 * /api/stops/{id}:
 *   get:
 *     summary: Get stop by ID
 *     description: Retrieve details of a specific stop by its ID.
 *     tags:
 *       - Stops
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The unique identifier of the stop.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully retrieved the stop details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stop_id:
 *                   type: string
 *                   description: The unique identifier for the stop.
 *                 stop_code:
 *                   type: string
 *                   description: The code of the stop.
 *                 stop_name:
 *                   type: string
 *                   description: The name of the stop.
 *                 stop_lat:
 *                   type: number
 *                   description: The latitude of the stop.
 *                 stop_lon:
 *                   type: number
 *                   description: The longitude of the stop.
 *       404:
 *         description: Stop not found
 *       500:
 *         description: Internal Server Error
 */
router.get('/:id', getStopById);

export default router;

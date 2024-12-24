import express from 'express';
import { getTripUpdateById } from '../controllers/tripUpdateController.js'; // Import the controller function

const router = express.Router();

/**
 * @swagger
 * /api/trip-updates/{tripId}:
 *   get:
 *     summary: Get trip update by tripId
 *     description: Retrieve the details of a trip update by its tripId.
 *     tags:
 *       - RealTime - Trip Updates
 *     parameters:
 *       - name: tripId
 *         in: path
 *         required: true
 *         description: The unique ID of the trip update to retrieve.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully retrieved the trip update details.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 trip_id:
 *                   type: string
 *                   description: Unique identifier for the trip update.
 *                 route_id:
 *                   type: string
 *                   description: The route ID associated with the trip.
 *                 schedule_relationship:
 *                   type: string
 *                   description: The schedule relationship (e.g., "scheduled", "actual").
 *                 delay:
 *                   type: string
 *                   description: The delay in seconds for the trip update.
 *                 vehicle_id:
 *                   type: string
 *                   description: The vehicle ID associated with the trip update.
 *                 stop_updates:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       stop_id:
 *                         type: string
 *                         description: The ID of the stop.
 *                       arrival_time:
 *                         type: string
 *                         description: Arrival time at the stop.
 *                       departure_time:
 *                         type: string
 *                         description: Departure time from the stop.
 *                       delay:
 *                         type: string
 *                         description: Delay at the stop.
 *       404:
 *         description: Trip update not found
 *       500:
 *         description: Internal Server Error
 */
router.get('/:tripId', getTripUpdateById);

export default router;

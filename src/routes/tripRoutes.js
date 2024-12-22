import express from 'express';
import { getAllTrips, getTripById } from '../controllers/tripController.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Trips
 *   description: Operations related to trips, including fetching trip details.
 */

/**
 * @swagger
 * /api/trips:
 *   get:
 *     summary: Get all trips
 *     description: Retrieve a list of all trips available in the system.
 *     tags:
 *       - Trips
 *     responses:
 *       200:
 *         description: Successfully retrieved all trips.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   trip_id:
 *                     type: string
 *                     description: Unique identifier for the trip.
 *                   route_id:
 *                     type: string
 *                     description: The route ID associated with the trip.
 *                   trip_headsign:
 *                     type: string
 *                     description: The headsign of the trip.
 *                   service_id:
 *                     type: string
 *                     description: The service ID for the trip.
 *                   direction_id:
 *                     type: string
 *                     description: The direction of the trip.
 *       500:
 *         description: Internal Server Error
 */
router.get('/', getAllTrips);

/**
 * @swagger
 * /api/trips/{id}:
 *   get:
 *     summary: Get trip details by ID
 *     description: Retrieve the details of a specific trip by its trip ID.
 *     tags:
 *       - Trips
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The unique ID of the trip to retrieve.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully retrieved the trip details.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 trip_id:
 *                   type: string
 *                   description: Unique identifier for the trip.
 *                 route_id:
 *                   type: string
 *                   description: The route ID associated with the trip.
 *                 trip_headsign:
 *                   type: string
 *                   description: The headsign of the trip.
 *                 service_id:
 *                   type: string
 *                   description: The service ID for the trip.
 *                 direction_id:
 *                   type: string
 *                   description: The direction of the trip.
 *       404:
 *         description: Trip not found
 *       500:
 *         description: Internal Server Error
 */
router.get('/:id', getTripById);

export default router;

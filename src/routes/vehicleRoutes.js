import express from 'express';
import { getVehiclePosition } from '../controllers/vehicleController.js';

const router = express.Router();

/**
 * @swagger
 * /api/vehicle/{vehicleId}:
 *   get:
 *     summary: Get real-time vehicle position
 *     description: Retrieve the real-time position of a specific vehicle by its vehicleId.
 *     tags:
 *       - Track Vehicles
 *     parameters:
 *       - name: vehicleId
 *         in: path
 *         required: true
 *         description: The unique identifier of the vehicle to retrieve its position.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully retrieved the vehicle position
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 vehicle_id:
 *                   type: string
 *                   description: The unique identifier of the vehicle.
 *                 lat:
 *                   type: number
 *                   description: The latitude of the vehicle.
 *                 lon:
 *                   type: number
 *                   description: The longitude of the vehicle.
 *                 updatedAt:
 *                   type: string
 *                   description: The timestamp when the vehicle position was updated.
 *       404:
 *         description: Vehicle not found
 *       500:
 *         description: Internal Server Error
 */
router.get('/vehicle/:vehicleId', getVehiclePosition);

export default router;

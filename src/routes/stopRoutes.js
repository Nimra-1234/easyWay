import express from 'express';
import { getAllStops, getStopById, updateStopName, deleteStopById } from '../controllers/stopController.js';

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

/**
 * @swagger
 * /api/stops/update-stop:
 *   put:
 *     summary: Update the name of a stop
 *     description: Updates the name of a specific stop by stop ID.
 *     tags: [Stops]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - stop_id
 *               - new_name
 *             properties:
 *               stop_id:
 *                 type: string
 *                 description: The unique identifier for the stop.
 *                 example: '12345'
 *               new_name:
 *                 type: string
 *                 description: The new name for the stop.
 *                 example: 'My Favourite Stop'
 *     responses:
 *       200:
 *         description: The stop name was updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Stop ID 12345 updated to 'My Favourite Stop'"
 *       400:
 *         description: Bad request, missing stop_id or new_name.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Missing stop_id or new_name in request body"
 *       404:
 *         description: The stop was not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Stop not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Error updating stop"
 */

router.put('/update-stop', updateStopName);

/**
 * @swagger
 * /api/stops/delete-stop/{stop_id}:
 *   delete:
 *     summary: Delete a specific stop
 *     description: Deletes a stop by its unique stop_id.
 *     tags: [Stops]
 *     parameters:
 *       - in: path
 *         name: stop_id
 *         required: true
 *         description: Unique identifier of the stop to delete.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Stop deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Stop with ID 05000 has been deleted"
 *       404:
 *         description: Stop not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Stop not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Error deleting stop"
 */
router.delete('/delete-stop/:stop_id', deleteStopById);

export default router;

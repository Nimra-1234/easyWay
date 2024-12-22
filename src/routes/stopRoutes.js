import express from 'express';
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Bookings
 *   description: Operations related to bookings, including creating and retrieving booking details.
 */

/**
 * @swagger
 * /api/bookings:
 *   post:
 *     summary: Create a new booking
 *     description: Create a new booking in the system for a user, associating the booking with a trip and route.
 *     tags:
 *       - Bookings
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: The ID of the user making the booking.
 *               tripId:
 *                 type: string
 *                 description: The ID of the trip the user is booking for.
 *               routeId:
 *                 type: string
 *                 description: The ID of the route the user is booking for.
 *     responses:
 *       201:
 *         description: Successfully created a booking
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Internal Server Error
 */
router.post('/bookings', (req, res) => {
    res.send('Booking created!');
});

/**
 * @swagger
 * /api/bookings:
 *   get:
 *     summary: Get all bookings
 *     description: Retrieve all bookings in the system.
 *     tags:
 *       - Bookings
 *     responses:
 *       200:
 *         description: Successfully retrieved all bookings
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   bookingId:
 *                     type: string
 *                     description: The unique identifier for the booking
 *                   userId:
 *                     type: string
 *                     description: The ID of the user who made the booking
 *                   tripId:
 *                     type: string
 *                     description: The ID of the booked trip
 *                   routeId:
 *                     type: string
 *                     description: The ID of the booked route
 *       500:
 *         description: Internal Server Error
 */
router.get('/bookings', (req, res) => {
    res.send('All bookings fetched!');
});

/**
 * @swagger
 * /api/bookings/{id}:
 *   get:
 *     summary: Get booking by ID
 *     description: Retrieve details of a specific booking by its ID.
 *     tags:
 *       - Bookings
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The unique identifier of the booking.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully retrieved the booking details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 bookingId:
 *                   type: string
 *                   description: The unique identifier for the booking
 *                 userId:
 *                   type: string
 *                   description: The ID of the user who made the booking
 *                 tripId:
 *                   type: string
 *                   description: The ID of the booked trip
 *                 routeId:
 *                   type: string
 *                   description: The ID of the booked route
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Internal Server Error
 */
router.get('/bookings/:id', (req, res) => {
    res.send(`Booking with ID ${req.params.id}`);
});

export default router;

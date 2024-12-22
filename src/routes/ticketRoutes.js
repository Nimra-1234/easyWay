import express from 'express';
import { createTicket, getTicket } from '../controllers/ticketController.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Tickets
 *   description: Operations related to ticketing, including creation and details retrieval.
 */

/**
 * @swagger
 * /api/tickets/create:
 *   post:
 *     summary: Create a new ticket
 *     description: Creates a new ticket for the user by providing details such as the user's name, taxCode, routeId, and tripId.
 *     tags:
 *       - Tickets
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the user purchasing the ticket.
 *               taxCode:
 *                 type: string
 *                 description: Unique tax code for the user.
 *               routeId:
 *                 type: string
 *                 description: The ID of the route the user is traveling on.
 *               tripId:
 *                 type: string
 *                 description: The ID of the trip for which the ticket is being created.
 *     responses:
 *       201:
 *         description: Successfully created the ticket.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message.
 *                 ticket:
 *                   type: object
 *                   properties:
 *                     ticketId:
 *                       type: string
 *                       description: The unique ID for the ticket.
 *                     userId:
 *                       type: string
 *                       description: The taxCode of the user.
 *                     routeId:
 *                       type: string
 *                       description: The route ID for the trip.
 *                     tripId:
 *                       type: string
 *                       description: The trip ID associated with the ticket.
 *       400:
 *         description: Missing required fields (name, taxCode, routeId, tripId).
 *       500:
 *         description: Internal Server Error
 */
router.post('/create', createTicket);

/**
 * @swagger
 * /api/tickets/{ticketId}:
 *   get:
 *     summary: Get ticket details by ticket ID
 *     description: Retrieve the details of a ticket by its ticket ID.
 *     tags:
 *       - Tickets
 *     parameters:
 *       - name: ticketId
 *         in: path
 *         required: true
 *         description: The unique ID of the ticket to retrieve.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully retrieved the ticket details.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ticketId:
 *                   type: string
 *                   description: The unique ID for the ticket.
 *                 userId:
 *                   type: string
 *                   description: The taxCode of the user.
 *                 routeId:
 *                   type: string
 *                   description: The route ID for the trip.
 *                 tripId:
 *                   type: string
 *                   description: The trip ID associated with the ticket.
 *                 status:
 *                   type: string
 *                   description: The current status of the ticket.
 *       404:
 *         description: Ticket not found
 *       500:
 *         description: Internal Server Error
 */
router.get('/:ticketId', getTicket);  // Uncomment authenticate middleware if needed

export default router;

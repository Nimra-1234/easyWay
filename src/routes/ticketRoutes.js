import express from 'express';
import { isAdmin } from '../middleware/adminMiddleware.js';
import { 
    createTicket, 
    getTicket, 
    getUserTickets
} from '../controllers/ticketController.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Tickets
 *   description: Operations related to ticketing, including creation, retrieval, and user statistics
 */

/**
 * @swagger
 * /api/tickets/create:
 *   post:
 *     summary: Create a new ticket
 *     description: Creates a new ticket that automatically expires after 70 minutes
 *     tags:
 *       - Tickets
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - taxCode
 *               - routeId
 *               - tripId
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the user purchasing the ticket
 *               taxCode:
 *                 type: string
 *                 description: Unique tax code for the user (14 characters)
 *                 pattern: ^[a-zA-Z0-9]{14}$
 *               routeId:
 *                 type: string
 *                 description: The ID of the route
 *               tripId:
 *                 type: string
 *                 description: The ID of the trip
 *     responses:
 *       201:
 *         description: Successfully created the ticket
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 ticket:
 *                   type: object
 *                   properties:
 *                     ticketId:
 *                       type: string
 *                     userId:
 *                       type: string
 *                     routeId:
 *                       type: string
 *                     tripId:
 *                       type: string
 *                     status:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     expired_at:
 *                       type: string
 *                       format: date-time
 *                 expiresIn:
 *                   type: string
 *                   example: "4200 seconds"
 */
router.post('/create', createTicket);

/**
 * @swagger
 * /api/tickets/{ticketId}:
 *   get:
 *     summary: Get ticket details
 *     description: Retrieve ticket details including remaining time before expiration
 *     tags:
 *       - Tickets
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ticket's unique identifier
 *     responses:
 *       200:
 *         description: Ticket details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ticketId:
 *                   type: string
 *                 userId:
 *                   type: string
 *                 status:
 *                   type: string
 *                 timeRemaining:
 *                   type: string
 *                   example: "3540 seconds"
 *       404:
 *         description: Ticket not found or expired
 */
router.get('/:ticketId', getTicket);

/**
 * @swagger
 * /api/tickets/user/{taxCode}:
 *   get:
 *     summary: Get user's tickets
 *     description: Retrieve all active tickets and ticket statistics for a user
 *     tags:
 *       - Tickets
 *     parameters:
 *       - in: path
 *         name: taxCode
 *         required: true
 *         schema:
 *           type: string
 *         description: User's tax code
 *     responses:
 *       200:
 *         description: Successfully retrieved user's tickets
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 activeTickets:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       ticketId:
 *                         type: string
 *                       timeRemaining:
 *                         type: string
 *                 totalTicketsPurchased:
 *                   type: integer
 *                 activeTicketCount:
 *                   type: integer
 */
router.get('/user/:taxCode', getUserTickets);

// /**
//  * @swagger
//  * /api/tickets/user/{taxCode}/stats:
//  *   get:
//  *     summary: Get user's ticket statistics
//  *     description: Retrieve statistics about a user's ticket purchases and usage
//  *     tags:
//  *       - Tickets
//  *     parameters:
//  *       - in: path
//  *         name: taxCode
//  *         required: true
//  *         schema:
//  *           type: string
//  *         description: User's tax code
//  *     responses:
//  *       200:
//  *         description: Successfully retrieved user statistics
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 user:
//  *                   type: object
//  *                   properties:
//  *                     taxCode:
//  *                       type: string
//  *                     name:
//  *                       type: string
//  *                     createdAt:
//  *                       type: string
//  *                       format: date-time
//  *                 ticketStats:
//  *                   type: object
//  *                   properties:
//  *                     totalPurchased:
//  *                       type: integer
//  *                     activeCount:
//  *                       type: integer
//  *                     expiredCount:
//  *                       type: integer
//  *       404:
//  *         description: User not found
//  */
// router.get('/user/:taxCode/stats', getUserStats);

export default router;
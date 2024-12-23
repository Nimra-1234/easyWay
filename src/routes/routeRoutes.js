import express from 'express';
import { getAllRoutes, getRouteById } from '../controllers/routeController.js';

const router = express.Router();

/**
 * @swagger
 * /api/routes:
 *   get:
 *     summary: Get all routes
 *     description: Retrieve all routes available in the system.
 *     tags:
 *       - Checking Routes
 *     responses:
 *       200:
 *         description: Successfully retrieved all routes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   route_id:
 *                     type: string
 *                     description: The unique identifier for the route.
 *                   route_short_name:
 *                     type: string
 *                     description: The short name of the route.
 *                   route_long_name:
 *                     type: string
 *                     description: The long name of the route.
 *                   route_type:
 *                     type: string
 *                     description: The type of the route (e.g., bus, train).
 *                   route_color:
 *                     type: string
 *                     description: The color representing the route.
 *       500:
 *         description: Internal Server Error
 */
router.get('/', getAllRoutes);

/**
 * @swagger
 * /api/routes/{id}:
 *   get:
 *     summary: Get route by ID
 *     description: Retrieve details of a specific route by its ID.
 *     tags:
 *       - Checking Routes
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The unique identifier of the route.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully retrieved the route details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 route_id:
 *                   type: string
 *                   description: The unique identifier for the route.
 *                 route_short_name:
 *                   type: string
 *                   description: The short name of the route.
 *                 route_long_name:
 *                   type: string
 *                   description: The long name of the route.
 *                 route_type:
 *                   type: string
 *                   description: The type of the route (e.g., bus, train).
 *                 route_color:
 *                   type: string
 *                   description: The color representing the route.
 *       404:
 *         description: Route not found
 *       500:
 *         description: Internal Server Error
 */
router.get('/:id', getRouteById);

export default router;

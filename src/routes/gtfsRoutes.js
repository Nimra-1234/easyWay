import express from 'express';
import { getRouteAnalytics, getBusyStops, getRoutesByTripCount,getStopsMostUsedByTrips,calculateAverageTripDuration} from '../controllers/gtfsController.js';

const router = express.Router();

/**
 * @openapi
 * /api/gtfs/routes/analytics:
 *   get:
 *     tags:
 *       - Analytics
 *     summary: Retrieve analytics for GTFS routes.
 *     description: Returns detailed analytics for each route including total trips, unique stops, and service coverage.
 *     responses:
 *       200:
 *         description: Successfully retrieved route analytics.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         description: Route identifier
 *                         example: "102"
 *                       route_short_name:
 *                         type: string
 *                         example: "10"
 *                       route_long_name:
 *                         type: string
 *                         example: "Airport - Downtown"
 *                       total_trips:
 *                         type: integer
 *                         example: 150
 *                       number_of_stops:
 *                         type: integer
 *                         example: 25
 *                       service_coverage:
 *                         type: number
 *                         example: 6.0
 *       500:
 *         description: Server error
 */
router.get('/routes/analytics', getRouteAnalytics);

/**
 * @openapi
 * /api/gtfs/stops/busy:
 *   get:
 *     tags:
 *       - Stops
 *     summary: Retrieve information on busy stops.
 *     description: Returns details of the busiest stops based on the number of visits.
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         required: false
 *         description: Limit the number of results returned
 *     responses:
 *       200:
 *         description: Successfully retrieved list of busy stops.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       stop_id:
 *                         type: string
 *                         example: "2000"
 *                       stop_name:
 *                         type: string
 *                         example: "Main St Station"
 *                       total_visits:
 *                         type: integer
 *                         example: 2300
 *       500:
 *         description: Server error
 */
router.get('/stops/busy', getBusyStops);

/**
 * @openapi
 * /api/gtfs/routes/tripcount:
 *   get:
 *     tags:
 *       - Routes
 *     summary: Retrieve routes with a specific number of trips.
 *     description: Returns a list of routes that have exactly the specified number of trips.
 *     parameters:
 *       - in: query
 *         name: tripcount
 *         schema:
 *           type: integer
 *         required: true
 *         description: The exact number of trips to filter the routes by.
 *     responses:
 *       200:
 *         description: Successfully retrieved routes.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         description: Route identifier
 *                         example: "102"
 *                       route_short_name:
 *                         type: string
 *                         example: "10"
 *                       route_long_name:
 *                         type: string
 *                         example: "Airport - Downtown"
 *                       total_trips:
 *                         type: integer
 *                         example: 50
 *       400:
 *         description: Invalid trip count specified
 *       500:
 *         description: Server error
 */
router.get('/routes/tripcount', getRoutesByTripCount);
/**
 * @openapi
 * /api/gtfs/stops/most-used:
 *   get:
 *     summary: Find stops used by the most trips
 *     tags: [Most used Stops]
 *     description: Retrieves the top stops based on the number of trips that stop there.
 *     responses:
 *       200:
 *         description: A list of stops most frequently used by trips.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       stopId:
 *                         type: string
 *                         example: "12345"
 *                       stopName:
 *                         type: string
 *                         example: "Downtown Station"
 *                       tripCount:
 *                         type: integer
 *                         example: 320
 *       500:
 *         description: Server error
 */

router.get('/stops/most-used', getStopsMostUsedByTrips);

/**
 * @swagger
 * /api/gtfs/routes/{routeId}/average-duration:
 *   get:
 *     summary: Calculate average trip duration for a specific route
 *     tags: [Trip Duration]
 *     description: Returns the average duration of all trips associated with a specific route ID.
 *     parameters:
 *       - in: path
 *         name: routeId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the route
 *     responses:
 *       200:
 *         description: Average duration of trips for the route
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         description: The route ID
 *                         example: "100"
 *                       averageDuration:
 *                         type: number
 *                         description: The average duration of trips in minutes
 *                         example: 120
 *       400:
 *         description: Invalid input, object invalid
 *       500:
 *         description: Error occurred while calculating average duration
 */


router.get('/routes/:routeId/average-duration', calculateAverageTripDuration);

export default router;

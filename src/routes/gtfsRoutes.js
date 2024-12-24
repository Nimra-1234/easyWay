import express from 'express';
import { getRouteAnalytics, getBusyStops, getRoutesByTripCount,calculateAverageTripDuration,getStopTimesByTrip, getRoutesActiveOnDays} from '../controllers/gtfsController.js';

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
 *       - Details of Busy Stops
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
 *       - RoutesCount
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

/**
 * @openapi
 * /api/gtfs/trips/{tripId}/stop-times:
 *   get:
 *     tags:
 *       - Stop Times by trip
 *     summary: Retrieve stop times for a specific trip.
 *     description: Returns a list of stop times ordered by stop sequence for a given trip ID.
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the trip to retrieve stop times for.
 *     responses:
 *       200:
 *         description: Successfully retrieved stop times.
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
 *                     $ref: '#/components/schemas/StopTime'
 *       404:
 *         description: Trip not found
 *       500:
 *         description: Server error
 */


router.get('/trips/:tripId/stop-times', getStopTimesByTrip);

/**
 * @openapi
 * /api/gtfs/routes/active:
 *   get:
 *     tags:
 *       - Active Routes On Days
 *     summary: Retrieve active routes on a specific date.
 *     description: Returns a list of routes that are active on the provided date. The date should be in YYYYMMDD format.
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *           example: '20241223'
 *         required: true
 *         description: The date to check for active routes, formatted as YYYYMMDD.
 *     responses:
 *       200:
 *         description: Successfully retrieved list of active routes.
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
 *                       route_id:
 *                         type: string
 *                         example: "102"
 *                       route_short_name:
 *                         type: string
 *                         example: "10"
 *                       route_long_name:
 *                         type: string
 *                         example: "Airport - Downtown"
 *                       is_active:
 *                         type: boolean
 *                         example: true
 *       400:
 *         description: Bad request, possible incorrect date format.
 *       500:
 *         description: Server error
 */
router.get('/routes/active', getRoutesActiveOnDays);


export default router;

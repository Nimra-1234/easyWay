import express from 'express';
import { isAdmin } from '../middleware/adminMiddleware.js';
import { getBusyStops, calculateTripDuration,getRoutesByTripCount,calculateRouteAverageDuration} from '../controllers/gtfsController.js';

const router = express.Router();


/**
 * @openapi
 * /api/gtfs/stops/busy:
 *   get:
 *     tags:
 *       - Busy Stops
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
 * @swagger
 * /api/gtfs/trips/{tripId}/duration:
 *   get:
 *     summary: Calculate duration for a specific trip
 *     tags: [Trip Duration]
 *     description: Returns the duration and stop details for a specific trip ID
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the trip (e.g., "1#1-2")
 *     responses:
 *       200:
 *         description: Trip duration successfully calculated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     tripId:
 *                       type: string
 *                       description: The trip identifier
 *                       example: "1#1-2"
 *                     duration:
 *                       type: object
 *                       properties:
 *                         minutes:
 *                           type: number
 *                           description: Trip duration in minutes
 *                           example: 45.5
 *                         seconds:
 *                           type: number
 *                           description: Trip duration in seconds
 *                           example: 2730
 *                     route:
 *                       type: object
 *                       properties:
 *                         firstStop:
 *                           type: string
 *                           description: Name of the first stop
 *                           example: "TOR VERGATA/SCHIAVONETTI"
 *                         lastStop:
 *                           type: string
 *                           description: Name of the last stop
 *                           example: "TERMINI (MA-MB-FS)"
 *                         startTime:
 *                           type: string
 *                           description: Trip start time
 *                           example: "07:28:00"
 *                         endTime:
 *                           type: string
 *                           description: Trip end time
 *                           example: "08:13:00"
 *       404:
 *         description: No stops found for the specified trip
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
 *                   example: "No stops found for trip 1#1-2"
 *       500:
 *         description: Server error while calculating trip duration
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
 *                   example: "Error calculating trip duration"
 */

router.get('/trips/:tripId/duration', calculateTripDuration);

/**
 * @swagger
 * /api/gtfs/admin/routes/trip-analysis:
 *   get:
 *     summary: Get routes with highest and lowest number of trips (Admin Only)
 *     tags: [Admin]
 *     security:
 *       - adminAuth: []
 *     description: Admin endpoint to retrieve information about routes with the most and least number of trips
 *     parameters:
 *       - in: header
 *         name: tax-code
 *         schema:
 *           type: string
 *           pattern: ^[A-Z0-9]{14}$
 *         required: true
 *         description: Admin tax code for authentication
 *         example: ADMIN12345MAIN
 *     responses:
 *       200:
 *         description: Successfully retrieved route analysis
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     largest_route:
 *                       type: object
 *                       properties:
 *                         route_id:
 *                           type: string
 *                           example: "211"
 *                         route_name:
 *                           type: string
 *                           example: "211"
 *                         trip_count:
 *                           type: number
 *                           example: 150
 *                         last_updated:
 *                           type: string
 *                           format: date-time
 *                           example: "2025-01-17T23:30:00Z"
 *                     smallest_route:
 *                       type: object
 *                       properties:
 *                         route_id:
 *                           type: string
 *                           example: "C2"
 *                         route_name:
 *                           type: string
 *                           example: "C2"
 *                         trip_count:
 *                           type: number
 *                           example: 25
 *                         last_updated:
 *                           type: string
 *                           format: date-time
 *                           example: "2025-01-17T23:30:00Z"
 *                     metadata:
 *                       type: object
 *                       properties:
 *                         total_routes:
 *                           type: number
 *                           example: 50
 *                         average_trips:
 *                           type: number
 *                           example: 75
 *                         analysis_timestamp:
 *                           type: string
 *                           format: date-time
 *                           example: "2025-01-17T23:30:00Z"
 *       401:
 *         description: Authentication failed
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
 *                   example: "Admin authentication required"
 *       403:
 *         description: Not authorized
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
 *                   example: "Admin access required"
 *       404:
 *         description: No routes found
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
 *                   example: "No routes found"
 *       500:
 *         description: Server error
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
 *                   example: "Error analyzing routes"
 */
router.get('/admin/routes/trip-analysis', isAdmin, getRoutesByTripCount);

/**
 * @swagger
 * /api/gtfs/routes/{routeId}/average-duration:
 *   get:
 *     summary: Calculate average duration for all trips in a route
 *     description: Retrieves average, minimum, and maximum durations for trips grouped by direction and headsign
 *     tags:
 *       - Routes Average Duration
 *     parameters:
 *       - in: path
 *         name: routeId
 *         required: true
 *         schema:
 *           type: string
 *         description: The route ID (e.g., "T01")
 *         example: "T01"
 *     responses:
 *       200:
 *         description: Successfully retrieved route duration statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     routeId:
 *                       type: string
 *                       example: "T01"
 *                     directions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           direction:
 *                             type: number
 *                             example: 0
 *                           headsign:
 *                             type: string
 *                             example: "TUSCOLANA/ANAGNINA"
 *                           statistics:
 *                             type: object
 *                             properties:
 *                               averageDuration:
 *                                 type: number
 *                                 example: 72.5
 *                               minDuration:
 *                                 type: number
 *                                 example: 65.0
 *                               maxDuration:
 *                                 type: number
 *                                 example: 80.0
 *                               totalTrips:
 *                                 type: number
 *                                 example: 25
 *                           trips:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 tripId:
 *                                   type: string
 *                                   example: "1#1-2"
 *                                 duration:
 *                                   type: number
 *                                   example: 70.0
 *                                 totalStops:
 *                                   type: number
 *                                   example: 15
 *                                 firstStop:
 *                                   type: string
 *                                   example: "TOR VERGATA/SCHIAVONETTI"
 *                                 lastStop:
 *                                   type: string
 *                                   example: "CIMITERO LAURENTINO"
 *                                 startTime:
 *                                   type: string
 *                                   example: "07:28:00"
 *                                 endTime:
 *                                   type: string
 *                                   example: "08:38:00"
 *       404:
 *         description: No trips found for the specified route
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
 *                   example: "No trips found for route T01"
 *       500:
 *         description: Server error while calculating route duration
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
 *                   example: "Error calculating route average duration"
 */
router.get('/routes/:routeId/average-duration', calculateRouteAverageDuration);

export default router;

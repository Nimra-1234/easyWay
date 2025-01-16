import mongoose from 'mongoose';
import Route from '../models/routeModel.js';

export const getAllRoutes = async (req, res) => {
    try {
        const routes = await Route.aggregate([
            {
                $project: {
                    _id: 0,
                    route_id: 1,
                    agency_id: 1,
                    route_short_name: 1,
                    route_long_name: 1,
                    route_type: 1,
                    route_color: 1,
                    route_text_color: 1,
                    total_trips: { $size: "$trips" }
                }
            }
        ]);

        res.json({
            success: true,
            count: routes.length,
            data: routes
        });

    } catch (error) {
        console.error("Error fetching routes:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching routes",
            error: error.message
        });
    }
};

export const getRouteById = async (req, res) => {
    try {
        const { id: routeId } = req.params;
        const { includeTrips } = req.query;

        const pipeline = [
            {
                $match: { route_id: routeId }
            },
            {
                $project: {
                    _id: 0,
                    route_id: 1,
                    agency_id: 1,
                    route_short_name: 1,
                    route_long_name: 1,
                    route_type: 1,
                    route_color: 1,
                    route_text_color: 1,
                    total_trips: { $size: "$trips" },
                    trips: {
                        $cond: {
                            if: { $eq: [includeTrips, "true"] },
                            then: {
                                $map: {
                                    input: "$trips",
                                    as: "trip",
                                    in: {
                                        trip_id: "$$trip.trip_id",
                                        service_id: "$$trip.service_id",
                                        trip_headsign: "$$trip.trip_headsign",
                                        direction_id: "$$trip.direction_id",
                                        wheelchair_accessible: "$$trip.wheelchair_accessible"
                                    }
                                }
                            },
                            else: "$$REMOVE"
                        }
                    }
                }
            }
        ];

        const [route] = await Route.aggregate(pipeline);

        if (!route) {
            return res.status(404).json({
                success: false,
                message: `Route with ID ${routeId} not found`
            });
        }

        res.json({
            success: true,
            data: route
        });

    } catch (error) {
        console.error("Error fetching route:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching route",
            error: error.message
        });
    }
};
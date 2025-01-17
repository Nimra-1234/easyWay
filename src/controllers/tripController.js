import mongoose from 'mongoose';
import Trip from '../models/tripModel.js';

export const getAllTrips = async (req, res) => {
    try {
        const trips = await Trip.find(
            {}, 
            { 
                _id: 0,
                trip_id: 1,
                route_id: 1,
                service_id: 1,
                trip_headsign: 1,
                direction_id: 1,
                'itinerary.stop_name': 1,
                'itinerary.departure_time': 1,
                'itinerary.arrival_time': 1
            }
        ).limit(100);  // Keep a reasonable limit

        const processedTrips = trips.map(trip => ({
            trip_id: trip.trip_id,
            route_id: trip.route_id,
            service_id: trip.service_id,
            trip_headsign: trip.trip_headsign,
            direction_id: trip.direction_id,
            summary: {
                total_stops: trip.itinerary.length,
                first_stop: trip.itinerary[0]?.stop_name || 'N/A',
                last_stop: trip.itinerary[trip.itinerary.length - 1]?.stop_name || 'N/A',
                departure_time: trip.itinerary[0]?.departure_time || 'N/A',
                arrival_time: trip.itinerary[trip.itinerary.length - 1]?.arrival_time || 'N/A'
            }
        }));

        res.json({
            success: true,
            data: processedTrips
        });

    } catch (error) {
        console.error("Error fetching trips:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching trips",
            error: error.message
        });
    }
};

export const getTripById = async (req, res) => {
    try {
        const { id: tripId } = req.params;

        const trip = await Trip.findOne(
            { trip_id: tripId },
            { 
                _id: 0,
                trip_id: 1,
                route_id: 1,
                service_id: 1,
                trip_headsign: 1,
                direction_id: 1,
                itinerary: 1
            }
        );

        if (!trip) {
            return res.status(404).json({
                success: false,
                message: `Trip with ID ${tripId} not found`
            });
        }

        // Get first and last stop for summary
        const firstStop = trip.itinerary[0];
        const lastStop = trip.itinerary[trip.itinerary.length - 1];

        const formattedTrip = {
            trip_id: trip.trip_id,
            route_id: trip.route_id,
            service_id: trip.service_id,
            trip_headsign: trip.trip_headsign,
            direction_id: trip.direction_id,
            summary: {
                total_stops: trip.itinerary.length,
                first_stop: firstStop.stop_name,
                last_stop: lastStop.stop_name,
                departure_time: firstStop.departure_time,
                arrival_time: lastStop.arrival_time
            },
            itinerary: trip.itinerary
        };

        res.json({
            success: true,
            data: formattedTrip
        });

    } catch (error) {
        console.error("Error fetching trip:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching trip",
            error: error.message
        });
    }
};
import mongoose from 'mongoose';
import Trip from '../models/tripModel.js';

export const getAllTrips = async (req, res) => {
    try {
        // Simple find operation to get all trips
        const trips = await Trip.find(
            {}, 
            { 
                _id: 0,
                trip_id: 1,
                service_id: 1,
                trip_headsign: 1,
                direction_id: 1
            }
        ).limit(1000);  // Keep a reasonable limit

        res.json({
            success: true,
            data: trips
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
            { _id: 0 }  // Exclude _id field
        );

        if (!trip) {
            return res.status(404).json({
                success: false,
                message: `Trip with ID ${tripId} not found`
            });
        }

        res.json({
            success: true,
            data: trip
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
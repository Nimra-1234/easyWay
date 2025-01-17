import mongoose from 'mongoose';
import Stop from '../models/stopModel.js';

export const getAllStops = async (req, res) => {
    try {
        const stops = await Stop.find(
            {},
            {
                _id: 0,
                stop_id: 1,
                stop_name: 1,
                stop_lat: 1,
                stop_lon: 1,
                location_type: 1
            }
        ).limit(1000);

        res.json({
            success: true,
            count: stops.length,
            data: stops
        });

    } catch (error) {
        console.error("Error fetching stops:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching stops",
            error: error.message
        });
    }
};

export const getStopById = async (req, res) => {
    try {
        const { id: stopId } = req.params;

        const stop = await Stop.findOne(
            { stop_id: stopId }
        );

        if (!stop) {
            return res.status(404).json({
                success: false,
                message: `Stop with ID ${stopId} not found`
            });
        }

        res.json({
            success: true,
            data: stop
        });

    } catch (error) {
        console.error("Error fetching stop:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching stop",
            error: error.message
        });
    }
};

export const updateStopName = async (req, res) => {
    try {
        const { stop_id, new_name } = req.body;

        if (!stop_id || !new_name) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: stop_id and new_name"
            });
        }

        const result = await Stop.updateOne(
            { stop_id: stop_id },
            { $set: { stop_name: new_name } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: `Stop with ID ${stop_id} not found`
            });
        }

        res.json({
            success: true,
            message: `Stop name updated successfully`,
            data: {
                stop_id,
                new_name,
                updated: result.modifiedCount === 1
            }
        });

    } catch (error) {
        console.error("Error updating stop:", error);
        res.status(500).json({
            success: false,
            message: "Error updating stop",
            error: error.message
        });
    }
};
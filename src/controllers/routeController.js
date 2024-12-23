import mongoose from 'mongoose';
import Route from '../models/routeModel.js'; //Assuming a Route model is defined in this path

export const getAllRoutes = async (req, res) => {
  try {
    const routes = await Route.find(); // Fetch all routes from the MongoDB collection
    res.json({
      success: true,
      data: routes
    });
  } catch (error) {
    console.error("Error fetching all routes:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const getRouteById = async (req, res) => {
  try {
    const routeId = req.params.id;
    const route = await Route.findOne({ route_id: routeId }); // Assuming route_id is the field name

    if (!route) {
      return res.status(404).json({
        success: false,
        message: "Route not found"
      });
    }

    res.json({
      success: true,
      data: route
    });
  } catch (error) {
    console.error("Error fetching route by ID:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
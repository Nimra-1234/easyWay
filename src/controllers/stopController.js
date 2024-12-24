import mongoose from 'mongoose';
import Stop from '../models/stopModel.js'; //Assuming a Stop Model is defined in this path

export const getAllStops = async (req, res) => {
  try {
    const stops = await Stop.find().limit(1000); // Fetch all stops from the MongoDB collection
    res.json({
      success: true,
      data: stops
    });
  } catch (error) {
    console.error("Error fetching all stops:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const getStopById = async (req, res) => {
  try {
    const stopId = req.params.id;
    const stop = await Stop.findOne({ stop_id: stopId }); // Assuming route_id is the field name

    if (!stop) {
      return res.status(404).json({
        success: false,
        message: "Stop not found"
      });
    }

    res.json({
      success: true,
      data: stop
    });
  } catch (error) {
    console.error("Error fetching stop by ID:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};


export const updateStopName = async (req, res) => {
  const { stop_id, new_name } = req.body;

  if (!stop_id || !new_name) {
    console.log("Update attempt with incomplete data", req.body);
    return res.status(400).json({
      success: false,
      message: 'Missing stop_id or new_name in request body'
    });
  }

  try {
    const result = await Stop.findOneAndUpdate(
      { stop_id: stop_id },
      { stop_name: new_name },
      { new: true, runValidators: true }
    );

    if (!result) {
      console.log(`No stop found with ID: ${stop_id}`);
      return res.status(404).json({
        success: false,
        message: 'Stop not found'
      });
    }

    console.log(`Stop ID ${stop_id} updated to '${new_name}'`);
    res.json({
      success: true,
      message: `Stop ID ${stop_id} updated to '${new_name}'`
    });
  } catch (err) {
    console.error("Error updating stop", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};


export const deleteStopById = async (req, res) => {
  const { stop_id } = req.params; // Assuming stop_id is passed as a URL parameter

  try {
      const result = await Stop.deleteOne({ stop_id: stop_id });

      if (result.deletedCount === 0) {
          return res.status(404).json({
              success: false,
              message: 'Stop not found'
          });
      }

      res.json({
          success: true,
          message: `Stop with ID ${stop_id} has been deleted`
      });
  } catch (err) {
      res.status(500).json({
          success: false,
          error: err.message
      });
  }
};

export const getExpiredTickets = async (req, res) => {
  try {
    // Get all ticket keys
    const allTicketKeys = await redisClient.keys('ticket:*');
    
    // Fetch the ticket data for each ticketId
    const expiredTickets = await Promise.all(
      allTicketKeys.map(async (ticketKey) => {
        const ticket = await redisClient.hGetAll(ticketKey);

        // Check if ticket has expired
        const expiredAt = new Date(ticket.expired_at);
        const currentTime = new Date();

        if (expiredAt < currentTime) {
          return ticket; // Return the expired ticket
        }
      })
    );

    // Filter out undefined tickets (non-expired)
    const validExpiredTickets = expiredTickets.filter(ticket => ticket !== undefined);

    if (validExpiredTickets.length === 0) {
      return res.status(404).json({ error: 'No expired tickets found' });
    }

    // Return the expired tickets
    res.status(200).json(validExpiredTickets);

  } catch (error) {
    console.error('Error retrieving expired tickets:', error);
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
};
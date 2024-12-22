import client from '../config/redisClient.js';  // Adjust the path as per your project structure

// Function to find vehicles with a known trip_id (not 'unknown')
async function findVehiclesWithKnownTripId() {
  try {
    // Get all vehicle keys (e.g., vehicle:12345, vehicle:67890, etc.)
    const vehicleKeys = await client.keys('vehicle:*');
    
    // Loop through each vehicle key and check its trip_id field
    const vehiclesWithKnownTripId = [];

    for (const key of vehicleKeys) {
      const vehicleData = await client.hGetAll(key);
      
      // Check if the trip_id is not 'unknown'
      if (vehicleData.trip_id && vehicleData.trip_id !== 'unknown') {
        // Store the vehicle_id and trip_id
        vehiclesWithKnownTripId.push({
          vehicleId: key.replace('vehicle:', ''), // Extract vehicleId from the key
          tripId: vehicleData.trip_id
        });
      }
    }

    // Log the vehicles with known trip_id
    console.log('Vehicles with a known trip_id:', vehiclesWithKnownTripId);

    // Return the result
    return vehiclesWithKnownTripId;
  } catch (error) {
    console.error('Error fetching vehicle data:', error);
  }
}

// Run the function to find the vehicles
findVehiclesWithKnownTripId();

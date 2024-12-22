import csv from 'csv-parser';
import fs from 'fs';
import client from '../config/redisClient.js';

// Helper function to import data into Redis
const importData = async (filename, keyPrefix, idField) => {
  return new Promise((resolve, reject) => {
    const records = [];

    // Adjust the path to where your GTFS CSV files are stored
    fs.createReadStream(`C:/Users/Nimra Tahir/Downloads/rome_dataset/${filename}.txt`)  // Adjust the path accordingly
      .pipe(csv())
      .on('data', (data) => {
        records.push(data);
      })
      .on('end', async () => {
        try {
          for (const record of records) {
            const key = `${keyPrefix}:${record[idField]}`;

            // Store each field of the record as a Redis hash field
            const redisData = {};
            Object.keys(record).forEach((field) => {
              redisData[field] = record[field];
            });

            // Store the record in Redis
            await client.hSet(key, redisData);
          }

          console.log(`${filename} data imported successfully.`);
          resolve();  // Resolve the promise once the data import is complete
        } catch (error) {
          console.error(`Error storing data for ${filename} with id ${record[idField]}`, error);
          reject(error);
        }
      })
      .on('error', (error) => {
        console.error(`Error reading ${filename}`, error);
        reject(error);  // Reject the promise in case of an error
      });
  });
};

// Function to import all GTFS data (without stop_times)
const importGTFSData = async () => {
  try {
    // Import data sequentially to maintain relationships between data
    await importData('routes', 'route', 'route_id');       // Import route data
    await importData('stops', 'stop', 'stop_id');         // Import stop data
    await importData('trips', 'trip', 'trip_id');         // Import trip data
    
    console.log('All GTFS data imported successfully');
  } catch (error) {
    console.error('Error during GTFS data import:', error);
  }
};

// Call the function to start importing data
importGTFSData();

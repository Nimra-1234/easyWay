// import csv from 'csv-parser';
// import fs from 'fs';
// import client from '../config/redisClient.js';

// // Helper function to import data into Redis
// const importData = async (filename, keyPrefix, idField) => {
//   return new Promise((resolve, reject) => {
//     const records = [];

//     // Adjust the path to where your GTFS CSV files are stored
//     fs.createReadStream(`C:/Users/Nimra Tahir/Downloads/rome_dataset/${filename}.txt`)  // Adjust the path accordingly
//       .pipe(csv())
//       .on('data', (data) => {
//         records.push(data);
//       })
//       .on('end', async () => {
//         try {
//           for (const record of records) {
//             const key = `${keyPrefix}:${record[idField]}`;

//             // Store each field of the record as a Redis hash field
//             const redisData = {};
//             Object.keys(record).forEach((field) => {
//               redisData[field] = record[field];
//             });

//             // Store the record in Redis
//             await client.hSet(key, redisData);
//           }

//           console.log(`${filename} data imported successfully.`);
//           resolve();  // Resolve the promise once the data import is complete
//         } catch (error) {
//           console.error(`Error storing data for ${filename} with id ${record[idField]}`, error);
//           reject(error);
//         }
//       })
//       .on('error', (error) => {
//         console.error(`Error reading ${filename}`, error);
//         reject(error);  // Reject the promise in case of an error
//       });
//   });
// };

// // Function to import all GTFS data (without stop_times)
// const importGTFSData = async () => {
//   try {
//     // Import data sequentially to maintain relationships between data
//     await importData('routes', 'route', 'route_id');       // Import route data
//     await importData('stops', 'stop', 'stop_id');         // Import stop data
//     await importData('trips', 'trip', 'trip_id');         // Import trip data
    
//     console.log('All GTFS data imported successfully');
//   } catch (error) {
//     console.error('Error during GTFS data import:', error);
//   }
// };

// // Call the function to start importing data
// importGTFSData();


import csv from 'csv-parser';
import fs from 'fs';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import Route from '../models/routeModel.js';
import Stop from '../models/stopModel.js';
import Trip from '../models/tripModel.js';
import StopTime from '../models/stopTimeModel.js';
import Calendar from '../models/calendarModel.js';

// Configuration
const config = {
    mongodb: {
        url: 'mongodb://127.0.0.1:27017/gtfs_analysis',
        options: {
            family: 4,
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 10000,
        }
    },
    batchSize: 1000,
    dataPath: 'C:/Users/Nimra Tahir/Downloads/rome_dataset'
};

// Verify collection names
const verifyCollections = async () => {
    const models = [
        { model: Route, expectedName: 'routes' },
        { model: Stop, expectedName: 'stops' },
        { model: Trip, expectedName: 'trips' },
        { model: StopTime, expectedName: 'stoptimes' },
        { model: Calendar, expectedName: 'calendars'}
    ];

    for (const { model, expectedName } of models) {
        const actualName = model.collection.name;
        console.log(`Collection name check: Expected "${expectedName}", Got "${actualName}"`);
        if (actualName !== expectedName) {
            console.warn(`Warning: Collection name mismatch for ${expectedName}`);
        }
    }
};

// Enhanced MongoDB connection function with verification
const connectToMongoDB = async () => {
    try {
        if (mongoose.connection.readyState !== 1) {
            await mongoose.connect(config.mongodb.url, config.mongodb.options);
            console.log('Connected to MongoDB successfully.');
            
            // Verify database name
            const dbName = mongoose.connection.db.databaseName;
            console.log(`Connected to database: ${dbName}`);
            
            // Verify collections
            await verifyCollections();
        }
    } catch (error) {
        console.error('Failed to connect to MongoDB:', error.message);
        throw error;
    }
};

// Verify data after import
const verifyImport = async (Model, expectedCount) => {
    const actualCount = await Model.countDocuments();
    console.log(`Verification - Collection: ${Model.collection.name}`);
    console.log(`Expected count: ${expectedCount}, Actual count: ${actualCount}`);
    if (actualCount !== expectedCount) {
        console.warn('Warning: Count mismatch detected!');
    }
    
    // Sample verification
    const sample = await Model.findOne();
    console.log('Sample document:', sample);
    return actualCount === expectedCount;
};

const importData = async (filename, Model) => {
    let batch = [];
    let totalCount = 0;
    const filePath = `${config.dataPath}/${filename}.txt`;

    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }

    return new Promise((resolve, reject) => {
        const stream = fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', async (data) => {
                batch.push(data);
                if (batch.length >= config.batchSize) {
                    stream.pause();
                    try {
                        const result = await Model.insertMany(batch, { ordered: false });
                        totalCount += result.length;
                        console.log(`${filename}: Imported ${totalCount} records`);
                        batch = [];
                        stream.resume();
                    } catch (error) {
                        console.error(`Error during batch insert: ${error.message}`);
                        stream.destroy();
                        reject(error);
                    }
                }
            })
            .on('end', async () => {
                try {
                    if (batch.length > 0) {
                        const result = await Model.insertMany(batch, { ordered: false });
                        totalCount += result.length;
                    }
                    console.log(`${filename}: Complete - Total records: ${totalCount}`);
                    
                    // Verify immediately after import
                    await verifyImport(Model, totalCount);
                    resolve(totalCount);
                } catch (error) {
                    reject(error);
                }
            })
            .on('error', reject);
    });
};

const importGTFSData = async () => {
    try {
        await connectToMongoDB();
        
        // Clear existing data
        console.log('Clearing existing data...');
        await Promise.all([
            Route.deleteMany({}),
            Stop.deleteMany({}),
            Trip.deleteMany({}),
            StopTime.deleteMany({}),
            Calendar.deleteMany({}),
        ]);

        const imports = [
            { model: Route, name: 'routes' },
            { model: Stop, name: 'stops' },
            { model: Trip, name: 'trips' },
            { model: StopTime, name: 'stop_times' },
            { model: Calendar, name: 'calendar_dates'}
        ];

        for (const importItem of imports) {
            console.log(`\nImporting ${importItem.name}...`);
            const count = await importData(importItem.name, importItem.model);
            console.log(`${importItem.name} import completed with ${count} records`);
        }

        // Final verification
        console.log('\nPerforming final verification...');
        for (const { model } of imports) {
            const count = await model.countDocuments();
            console.log(`${model.collection.name}: ${count} records`);
        }

    } catch (error) {
        console.error('Import failed:', error);
        throw error;
    } finally {
        await mongoose.connection.close();
        console.log('MongoDB connection closed.');
    }
};

const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
    importGTFSData().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

export default importGTFSData;
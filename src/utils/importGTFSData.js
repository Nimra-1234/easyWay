// src/utils/importGTFSData.js
import admZip from 'adm-zip';
import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import Route from '../models/routeModel.js';
import Trip from '../models/tripModel.js';

// Helper function for memory usage logging
const logMemoryUsage = () => {
    const used = process.memoryUsage();
    console.log('Memory usage:');
    for (let key in used) {
        console.log(`${key}: ${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB`);
    }
};

// Helper function for time tracking
const getElapsedTime = (startTime) => {
    const elapsed = Date.now() - startTime;
    return (elapsed / 1000).toFixed(2);
};

// Parse CSV helper function
const parseCSVFile = async (filePath) => {
    const parseStartTime = Date.now();
    console.log(`\n📖 Parsing: ${path.basename(filePath)}`);
    const records = [];
    return new Promise((resolve, reject) => {
        let lastLogTime = Date.now();
        
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => {
                records.push(data);
                if (records.length % 10000 === 0 || Date.now() - lastLogTime > 5000) {
                    console.log(`⏳ Parsed ${records.length.toLocaleString()} records (${getElapsedTime(parseStartTime)}s)`);
                    lastLogTime = Date.now();
                }
            })
            .on('end', () => {
                console.log(`✅ Completed parsing ${path.basename(filePath)}`);
                console.log(`📊 Total records: ${records.length.toLocaleString()}`);
                console.log(`⏱️  Time taken: ${getElapsedTime(parseStartTime)}s`);
                resolve(records);
            })
            .on('error', (error) => {
                console.error(`❌ Error parsing ${path.basename(filePath)}:`, error);
                reject(error);
            });
    });
};

const importGTFSData = async ({ gtfsPath, batchSize = 1000, mongoUrl }) => {
    const startTime = Date.now();
    try {
        console.log('\n=== Starting GTFS Import Process ===');
        console.log(`Start time: ${new Date().toISOString()}`);

        // Connect to MongoDB
        console.log('\n📡 Connecting to MongoDB...');
        await mongoose.connect(mongoUrl, {
            connectTimeoutMS: 10000
        });
        console.log('✅ MongoDB connected successfully');

        // Clear existing data
        console.log('\n🗑️  Clearing existing data...');
        await Promise.all([
            Route.deleteMany({}),
            Trip.deleteMany({})
        ]);
        console.log('✅ Cleared existing data');

        // Parse files
        console.log('\n📑 Parsing GTFS files...');
        const stops = await parseCSVFile(path.join(gtfsPath, 'stops.txt'));
        const routes = await parseCSVFile(path.join(gtfsPath, 'routes.txt'));
        const trips = await parseCSVFile(path.join(gtfsPath, 'trips.txt'));

        // Create lookup maps
        console.log('\n🗺️  Creating lookup maps...');
        const stopsMap = new Map(stops.map(stop => [stop.stop_id, {
            stop_id: stop.stop_id,
            stop_name: stop.stop_name,
            stop_lat: parseFloat(stop.stop_lat),
            stop_lon: parseFloat(stop.stop_lon),
            location_type: parseInt(stop.location_type) || 0,
            wheelchair_boarding: parseInt(stop.wheelchair_boarding) || 0,
            zone_id: stop.zone_id
        }]));

        // Import routes
        console.log('\n🚌 Processing and importing routes...');
        const routeDocs = routes.map(route => ({
            route_id: route.route_id,
            agency_id: route.agency_id,
            route_short_name: route.route_short_name,
            route_long_name: route.route_long_name,
            route_type: parseInt(route.route_type),
            route_color: route.route_color,
            route_text_color: route.route_text_color,
            trips: trips
                .filter(trip => trip.route_id === route.route_id)
                .map(trip => ({
                    trip_id: trip.trip_id,
                    service_id: trip.service_id,
                    trip_headsign: trip.trip_headsign,
                    direction_id: parseInt(trip.direction_id) || 0,
                    wheelchair_accessible: parseInt(trip.wheelchair_accessible) || 0
                }))
        }));

        // Import routes in batches
        console.log('\n📥 Importing routes in batches...');
        for (let i = 0; i < routeDocs.length; i += batchSize) {
            const batch = routeDocs.slice(i, i + batchSize);
            try {
                await Route.insertMany(batch, { ordered: false });
                console.log(`✅ Imported routes ${i + 1} to ${i + batch.length} of ${routeDocs.length}`);
                if ((i + batch.length) % 1000 === 0) {
                    logMemoryUsage();
                }
            } catch (error) {
                console.error(`❌ Error in batch ${i + 1} to ${i + batch.length}:`, error.message);
            }
        }

        // Process stop_times
        console.log('\n⏳ Processing stop_times...');
        const stopTimesByTrip = new Map();
        let stopTimesProcessed = 0;

        await new Promise((resolve, reject) => {
            fs.createReadStream(path.join(gtfsPath, 'stop_times.txt'))
                .pipe(csv())
                .on('data', (data) => {
                    stopTimesProcessed++;
                    if (stopTimesProcessed % 100000 === 0) {
                        console.log(`   Processed ${stopTimesProcessed.toLocaleString()} stop_times`);
                    }

                    if (!stopTimesByTrip.has(data.trip_id)) {
                        stopTimesByTrip.set(data.trip_id, []);
                    }

                    const stopInfo = stopsMap.get(data.stop_id);
                    if (stopInfo) {
                        stopTimesByTrip.get(data.trip_id).push({
                            ...stopInfo,
                            stop_times: [{
                                arrival_time: data.arrival_time,
                                departure_time: data.departure_time,
                                stop_sequence: parseInt(data.stop_sequence),
                                pickup_type: parseInt(data.pickup_type) || 0,
                                drop_off_type: parseInt(data.drop_off_type) || 0
                            }]
                        });
                    }
                })
                .on('end', resolve)
                .on('error', reject);
        });

        // Import trips
        console.log('\n🚂 Processing and importing trips...');
        const tripDocs = trips.map(trip => ({
            trip_id: trip.trip_id,
            service_id: trip.service_id,
            trip_headsign: trip.trip_headsign,
            direction_id: parseInt(trip.direction_id) || 0,
            stops: (stopTimesByTrip.get(trip.trip_id) || [])
                .sort((a, b) => a.stop_times[0].stop_sequence - b.stop_times[0].stop_sequence)
        }));

        // Import trips in batches
        let tripsProcessed = 0;
        for (let i = 0; i < tripDocs.length; i += batchSize) {
            const batch = tripDocs.slice(i, i + batchSize);
            try {
                await Trip.insertMany(batch, { ordered: false });
                tripsProcessed += batch.length;
                console.log(`✅ Imported trips ${i + 1} to ${i + batch.length} of ${tripDocs.length}`);
                if (tripsProcessed % 1000 === 0) {
                    logMemoryUsage();
                }
            } catch (error) {
                console.error(`❌ Error importing trips batch:`, error.message);
            }
        }

        const finalCounts = await Promise.all([
            Route.countDocuments(),
            Trip.countDocuments()
        ]);

        console.log('\n=== Import Summary ===');
        console.log(`✅ Routes imported: ${finalCounts[0]}`);
        console.log(`✅ Trips imported: ${finalCounts[1]}`);
        console.log(`⏱️  Total time: ${getElapsedTime(startTime)}s`);
        logMemoryUsage();

    } catch (error) {
        console.error('\n❌ Import failed:', error);
        throw error;
    } finally {
        await mongoose.connection.close();
        console.log('\n👋 MongoDB connection closed');
    }
};

// Main function to run the import
const main = async () => {
    try {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        const projectRoot = path.resolve(__dirname, '../..');
        const gtfsPath = path.join(projectRoot, 'dataset', 'rome_dataset');

        await importGTFSData({
            gtfsPath,
            batchSize: 1000,
            mongoUrl: 'mongodb://127.0.0.1:27017/gtfs_analysis'
        });

    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
};

// Run the script if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

export default importGTFSData;
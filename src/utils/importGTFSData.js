import admZip from 'adm-zip';
import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import Route from '../models/routeModel.js';
import Trip from '../models/tripModel.js';
import Stop from '../models/stopModel.js'; 

// Keep all helper functions the same...
const logMemoryUsage = () => {
    const used = process.memoryUsage();
    console.log('Memory usage:');
    for (let key in used) {
        console.log(`${key}: ${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB`);
    }
};

const getElapsedTime = (startTime) => {
    const elapsed = Date.now() - startTime;
    return (elapsed / 1000).toFixed(2);
};

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
            Trip.deleteMany({}),
            Stop.deleteMany({})
        ]);
        console.log('✅ Cleared existing data');

        // Parse files
        console.log('\n📑 Parsing GTFS files...');
        const stops = await parseCSVFile(path.join(gtfsPath, 'stops.txt'));
        const routes = await parseCSVFile(path.join(gtfsPath, 'routes.txt'));
        const trips = await parseCSVFile(path.join(gtfsPath, 'trips.txt'));

        // Create stops lookup map for basic info
        const stopsBasicInfo = new Map(stops.map(stop => [
            stop.stop_id,
            {
                stop_id: stop.stop_id,
                stop_name: stop.stop_name
            }
        ]));

        // Import stops collection (unchanged)
        console.log('\n🚏 Processing and importing stops...');
        const stopDocs = stops.map(stop => ({
            stop_id: stop.stop_id,
            stop_name: stop.stop_name,
            stop_lat: parseFloat(stop.stop_lat),
            stop_lon: parseFloat(stop.stop_lon),
            location_type: parseInt(stop.location_type) || 0,
            stop_times: []
        }));

        for (let i = 0; i < stopDocs.length; i += batchSize) {
            const batch = stopDocs.slice(i, i + batchSize);
            try {
                await Stop.insertMany(batch, { ordered: false });
                console.log(`✅ Imported stops ${i + 1} to ${i + batch.length} of ${stopDocs.length}`);
            } catch (error) {
                console.error(`❌ Error importing stops batch:`, error.message);
            }
        }

        // Process stop_times
        console.log('\n⏳ Processing stop_times...');
        const stopTimesForStops = new Map();
        const stopTimesForTrips = new Map();
        let stopTimesProcessed = 0;

        await new Promise((resolve, reject) => {
            fs.createReadStream(path.join(gtfsPath, 'stop_times.txt'))
                .pipe(csv())
                .on('data', (data) => {
                    stopTimesProcessed++;
                    if (stopTimesProcessed % 100000 === 0) {
                        console.log(`   Processed ${stopTimesProcessed.toLocaleString()} stop_times`);
                    }

                    // For stops collection
                    if (!stopTimesForStops.has(data.stop_id)) {
                        stopTimesForStops.set(data.stop_id, []);
                    }
                    stopTimesForStops.get(data.stop_id).push({
                        arrival_time: data.arrival_time,
                        departure_time: data.departure_time,
                        pickup_type: parseInt(data.pickup_type) || 0,
                        drop_off_type: parseInt(data.drop_off_type) || 0
                    });

                    // For trips collection (modified for new structure)
                    if (!stopTimesForTrips.has(data.trip_id)) {
                        stopTimesForTrips.set(data.trip_id, []);
                    }
                    stopTimesForTrips.get(data.trip_id).push({
                        stop_id: data.stop_id,
                        arrival_time: data.arrival_time,
                        departure_time: data.departure_time,
                        sequence: parseInt(data.stop_sequence)
                    });
                })
                .on('end', resolve)
                .on('error', reject);
        });

        // Update stops with their stop times
        console.log('\n📝 Updating stops with stop times...');
        for (const [stopId, stopTimes] of stopTimesForStops) {
            try {
                await Stop.updateOne(
                    { stop_id: stopId },
                    { $set: { stop_times: stopTimes } }
                );
            } catch (error) {
                console.error(`❌ Error updating stop times for stop ${stopId}:`, error.message);
            }
        }

        // Import routes (unchanged)
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
        for (let i = 0; i < routeDocs.length; i += batchSize) {
            const batch = routeDocs.slice(i, i + batchSize);
            try {
                await Route.insertMany(batch, { ordered: false });
                console.log(`✅ Imported routes ${i + 1} to ${i + batch.length} of ${routeDocs.length}`);
            } catch (error) {
                console.error(`❌ Error importing routes batch:`, error.message);
            }
        }

        // Import trips with improved structure
        console.log('\n🚂 Processing and importing trips...');
        const tripDocs = trips.map(trip => {
            const tripStopTimes = stopTimesForTrips.get(trip.trip_id) || [];
            return {
                trip_id: trip.trip_id,
                trip_headsign: trip.trip_headsign,
                direction_id: parseInt(trip.direction_id) || 0,
                itinerary: tripStopTimes
                    .sort((a, b) => a.sequence - b.sequence)
                    .map(stopTime => {
                        const stopInfo = stopsBasicInfo.get(stopTime.stop_id);
                        return {
                            stop_id: stopInfo.stop_id,
                            stop_name: stopInfo.stop_name,
                            arrival_time: stopTime.arrival_time,
                            departure_time: stopTime.departure_time,
                            sequence: stopTime.sequence
                        };
                    })
            };
        });

        // Import trips in batches
        let tripsProcessed = 0;
        for (let i = 0; i < tripDocs.length; i += batchSize) {
            const batch = tripDocs.slice(i, i + batchSize);
            try {
                await Trip.insertMany(batch, { ordered: false });
                tripsProcessed += batch.length;
                console.log(`✅ Imported trips ${i + 1} to ${i + batch.length} of ${tripDocs.length}`);
            } catch (error) {
                console.error(`❌ Error importing trips batch:`, error.message);
            }
        }

        const finalCounts = await Promise.all([
            Route.countDocuments(),
            Trip.countDocuments(),
            Stop.countDocuments()
        ]);

        console.log('\n=== Import Summary ===');
        console.log(`✅ Routes imported: ${finalCounts[0]}`);
        console.log(`✅ Trips imported: ${finalCounts[1]}`);
        console.log(`✅ Stops imported: ${finalCounts[2]}`);
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

const main = async () => {
    try {
        console.log('Starting GTFS import process...');
        
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        
        // Path to project root and files
        const projectRoot = path.join(__dirname, '..', '..');
        const zipFilePath = path.join(projectRoot, 'rome_dataset.zip');
        console.log('Looking for zip file at:', zipFilePath);

        // Check if zip file exists
        if (!fs.existsSync(zipFilePath)) {
            console.error(`Zip file not found: ${zipFilePath}`);
            console.log('Please ensure the GTFS zip file is in the correct location.');
            process.exit(1);
        }
        console.log('✅ Found zip file');

        const extractBasePath = path.join(projectRoot, 'dataset');
        console.log('Base extraction path:', extractBasePath);

        // Create extraction directory if it doesn't exist
        if (!fs.existsSync(extractBasePath)) {
            console.log('Creating extraction directory...');
            fs.mkdirSync(extractBasePath, { recursive: true });
        }

        // Extract the zip file
        console.log('\n📦 Extracting GTFS zip file...');
        try {
            const zip = new admZip(zipFilePath);
            zip.extractAllTo(extractBasePath, true);
            console.log('✅ Extraction complete');
        } catch (error) {
            console.error('Error extracting zip file:', error);
            process.exit(1);
        }

        // Find the actual path where files are extracted
        let gtfsPath = path.join(extractBasePath, 'rome_dataset');
        console.log('Checking path:', gtfsPath);
        
        // If files are nested one level deeper, update the path
        if (fs.existsSync(path.join(gtfsPath, 'rome_dataset'))) {
            gtfsPath = path.join(gtfsPath, 'rome_dataset');
            console.log('Found nested directory, updated path to:', gtfsPath);
        }

        // List extracted files
        console.log('\nExtracted files in', gtfsPath, ':');
        const files = fs.readdirSync(gtfsPath);
        files.forEach(file => console.log(`- ${file}`));

        // Verify required files exist in extracted directory
        const requiredFiles = ['stops.txt', 'routes.txt', 'trips.txt', 'stop_times.txt'];
        const missingFiles = requiredFiles.filter(file => !fs.existsSync(path.join(gtfsPath, file)));
        
        if (missingFiles.length > 0) {
            console.error('Missing required GTFS files:', missingFiles);
            console.log('The zip file might be corrupted or missing required files.');
            process.exit(1);
        }
        console.log('✅ All required files present');

        console.log('\nStarting data import...');
        await importGTFSData({
            gtfsPath,
            batchSize: 1000,
            mongoUrl: 'mongodb://127.0.0.1:27017/gtfs_analysis'
        });

    } catch (error) {
        console.error('Fatal error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
};

// Make sure we're actually executing the main function
console.log('Script started');
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    console.log('Running main function...');
    main().catch(error => {
        console.error('Unhandled error in main:', error);
        process.exit(1);
    });
} else {
    console.log('Script imported but not directly run');
}
export default importGTFSData;
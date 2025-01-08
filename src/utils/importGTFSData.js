import admZip from 'adm-zip';
import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import Route from '../models/routeModel.js';
import Stop from '../models/stopModel.js';
import Trip from '../models/tripModel.js';
import StopTime from '../models/stopTimeModel.js';

// Get the directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const projectRoot = path.resolve(__dirname, '../..');
const zipFilePath = path.join(projectRoot, 'rome_dataset.zip');
const datasetPath = path.join(projectRoot, 'dataset');
const gtfsPath = path.join(datasetPath, 'rome_dataset');

const config = {
    mongodb: {
        url: 'mongodb://127.0.0.1:27017/gtfs_analysis',
        options: { connectTimeoutMS: 10000 }
    },
    batchSize: 1000
};

// Function to extract zip file
function extractZip(zipPath, extractTo) {
  try {
      const zip = new admZip(zipPath);
      
      // Log the contents of the zip file
      console.log('Zip file contents:', zip.getEntries().map(entry => entry.entryName));
      
      // Create the dataset directory if it doesn't exist
      if (!fs.existsSync(extractTo)) {
          fs.mkdirSync(extractTo, { recursive: true });
      }
      
      zip.extractAllTo(extractTo, true);
      
      // Log the contents of the extracted directory
      console.log('Extracted directory contents:', fs.readdirSync(extractTo));
      
      console.log(`Extracted ${zipPath} to ${extractTo}`);
  } catch (error) {
      console.error('Error extracting zip file:', error);
      throw error;
  }
}

function validateDatasetPath() {
  // Check if the zip file exists
  if (!fs.existsSync(zipFilePath)) {
      throw new Error(`Zip file not found at ${zipFilePath}`);
  }

  // If dataset directory doesn't exist or is empty, extract the zip
  if (!fs.existsSync(datasetPath) || fs.readdirSync(datasetPath).length === 0) {
      console.log(`Extracting dataset from ${zipFilePath}...`);
      extractZip(zipFilePath, datasetPath);
  }
  
  console.log('Dataset directory found at:', gtfsPath);
  console.log('Files in dataset directory:', fs.readdirSync(gtfsPath));

  const requiredFiles = ['routes.txt', 'stops.txt', 'trips.txt', 'stop_times.txt'];
  const missingFiles = requiredFiles.filter(file => !fs.existsSync(path.join(gtfsPath, file)));
  
  if (missingFiles.length > 0) {
      throw new Error(`Missing required files: ${missingFiles.join(', ')}`);
  }
}
const importData = async (filename, Model, transformFn = null) => {
  let batch = [];
  let totalCount = 0;
  const filePath = path.join(gtfsPath, `${filename}.txt`); // Update this line
  
  console.log(`Starting import of ${filename}...`);
  console.log(`Reading from: ${filePath}`);
    
    // Verify file exists
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }

    return new Promise((resolve, reject) => {
        const stream = fs.createReadStream(filePath)
            .pipe(csv());
            
        stream.on('data', (data) => {
            const transformedData = transformFn ? transformFn(data) : data;
            batch.push(transformedData);
            
            if (batch.length >= config.batchSize) {
                stream.pause();
                Model.insertMany(batch)
                    .then(() => {
                        totalCount += batch.length;
                        console.log(`${filename}: Imported ${totalCount} records`);
                        batch = [];
                        stream.resume();
                    })
                    .catch(error => {
                        stream.destroy();
                        reject(error);
                    });
            }
        });

        stream.on('end', async () => {
            try {
                if (batch.length > 0) {
                    await Model.insertMany(batch);
                    totalCount += batch.length;
                }
                console.log(`${filename}: Completed - Total ${totalCount} records`);
                resolve(totalCount);
            } catch (error) {
                reject(error);
            }
        });

        stream.on('error', (error) => {
            console.error(`Error reading ${filename}:`, error);
            reject(error);
        });
    });
};

const importGTFSData = async () => {
  try {
      // Validate dataset path before connecting to MongoDB
      validateDatasetPath();

      await mongoose.connect(config.mongodb.url, config.mongodb.options);
      console.log('Connected to MongoDB');

      // Ensure indexes are created before import
      console.log('Creating indexes...');
      await Promise.all([
          StopTime.createIndexes(),
          Route.createIndexes(),
          Stop.createIndexes(),
          Trip.createIndexes()
      ]);
      console.log('Indexes created successfully');

      console.log('Clearing existing data...');
      await Promise.all([
          Route.deleteMany({}),
          Stop.deleteMany({}),
          Trip.deleteMany({}),
          StopTime.deleteMany({})
      ]);

      // Rest of your import code...
      console.log('Importing routes...');
      await importData('routes', Route);
      
      console.log('Importing stops...');
      await importData('stops', Stop);

      const stops = await Stop.find({}).lean();
      const routes = await Route.find({}).lean();
      const stopsMap = new Map(stops.map(stop => [stop.stop_id, stop]));
      const routesMap = new Map(routes.map(route => [route.route_id, route]));

      console.log('Importing trips...');
      await importData('trips', Trip, (tripData) => {
          const routeInfo = routesMap.get(tripData.route_id);
          if (routeInfo) {
              tripData.route_info = {
                  route_short_name: routeInfo.route_short_name,
                  route_long_name: routeInfo.route_long_name,
                  route_type: routeInfo.route_type
              };
          }
          return tripData;
      });

      console.log('Importing stop times...');
      await importData('stop_times', StopTime, (stopTimeData) => {
          const stopInfo = stopsMap.get(stopTimeData.stop_id);
          if (stopInfo) {
              stopTimeData.stop_info = {
                  stop_id: stopInfo.stop_id,
                  stop_name: stopInfo.stop_name,
                  stop_lat: stopInfo.stop_lat,
                  stop_lon: stopInfo.stop_lon,
                  zone_id: stopInfo.zone_id,
                  location_type: stopInfo.location_type
              };
          }
          return stopTimeData;
      });

      // Verify indexes after import with detailed information
      console.log('\n=== Index Verification ===');
      const collections = [
          { model: StopTime, name: 'StopTime' },
          { model: Route, name: 'Route' },
          { model: Stop, name: 'Stop' },
          { model: Trip, name: 'Trip' }
      ];

      for (const { model, name } of collections) {
          console.log(`\nVerifying ${name} Collection Indexes:`);
          const indexes = await model.collection.indexes();
          
          if (indexes.length === 0) {
              console.warn(`⚠️  No indexes found for ${name} collection!`);
          } else {
              console.log(`Found ${indexes.length} indexes:`);
              indexes.forEach((index, i) => {
                  console.log(`\n  ${i + 1}. Index Details:`);
                  console.log(`     Name: ${index.name}`);
                  console.log(`     Keys: ${JSON.stringify(index.key)}`);
                  console.log(`     Unique: ${index.unique || false}`);
                  console.log(`     Sparse: ${index.sparse || false}`);
                  if (index.background) console.log(`     Background: ${index.background}`);
              });
          }
          
          // Additional verification for expected indexes
          const expectedIndexes = model.schema.indexes();
          console.log(`\n  Expected Indexes for ${name}:`, expectedIndexes.length);
          expectedIndexes.forEach(([keys, options], i) => {
              console.log(`     ${i + 1}. ${JSON.stringify(keys)} ${JSON.stringify(options)}`);
          });
      }
      console.log('\n=== End Index Verification ===\n');

      const counts = await Promise.all([
          Route.countDocuments(),
          Stop.countDocuments(),
          Trip.countDocuments(),
          StopTime.countDocuments()
      ]);
      
      console.log('Final counts:', {
          Routes: counts[0],
          Stops: counts[1],
          Trips: counts[2],
          'Stop Times': counts[3]
      });

  } catch (error) {
      console.error('Import failed:', error);
      throw error;
  } finally {
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
  }
};

// Add error handlers for better debugging
process.on('unhandledRejection', (reason, promise) => {
    console.log('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.log('Uncaught Exception:', error);
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    importGTFSData()
        .then(() => process.exit(0))
        .catch(error => {
            console.error(error);
            process.exit(1);
        });
}

export default importGTFSData;
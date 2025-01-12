**Getting Started**
To run the application, follow these steps:

1. Start the Local Application
Run the following command to start the local application:
**node app.js**
2. Import GTFS Data into MongoDB
Use this command to populate MongoDB with GTFS data:
**node src/utils/importGTFSData.js**

3. Enable Real-Time Data Feed for Redis
Start the real-time data feed by running:
**node src/utils/gtfsRtData.js**

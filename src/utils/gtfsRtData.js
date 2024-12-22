import axios from 'axios';
import protobuf from 'protobufjs';
import fs from 'fs';
import client from '../config/redisClient.js';

const FEEDS = {
    vehiclePositions: 'https://romamobilita.it/sites/default/files/rome_rtgtfs_vehicle_positions_feed.pb',
    tripUpdates: 'https://romamobilita.it/sites/default/files/rome_rtgtfs_trip_updates_feed.pb',
    alerts: 'https://romamobilita.it/sites/default/files/rome_rtgtfs_service_alerts_feed.pb'
};

async function loadSchema() {
    const schema = await fs.promises.readFile('./src/schemas/gtfs_rt_schema.proto', 'utf8');
    return protobuf.parse(schema).root;
}

async function fetchAndDecodeFeed(url, FeedMessage) {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return FeedMessage.decode(new Uint8Array(response.data));
}

async function processVehiclePositions(decodedData) {
    let count = 0;
    for (const entity of decodedData.entity) {
        if (entity.vehicle) {
            const vehicle = entity.vehicle;
            const vehicleId = vehicle.vehicle?.id || vehicle.vehicle?.label;
            
            if (!vehicleId) continue;

            const vehicleData = {
                lat: vehicle.position?.latitude?.toString() || '',
                lon: vehicle.position?.longitude?.toString() || '',
                trip_id: vehicle.trip?.tripId || '',
                route_id: vehicle.trip?.routeId || '',
                speed: (vehicle.position?.speed || 0).toString(),
                bearing: (vehicle.position?.bearing || 0).toString(),
                timestamp: vehicle.timestamp?.toString() || Date.now().toString(),
                current_status: vehicle.currentStatus || '',
                occupancy_status: vehicle.occupancyStatus || ''
            };

            await client.hSet(`vehicle:${vehicleId}`, vehicleData);
            count++;
        }
    }
    console.log(`Processed ${count} vehicle positions`);
}

async function processTripUpdates(decodedData) {
    let count = 0;
    for (const entity of decodedData.entity) {
        if (entity.tripUpdate) {
            const tripUpdate = entity.tripUpdate;
            const tripId = tripUpdate.trip?.tripId;
            
            if (!tripId) continue;

            const stopTimeUpdates = tripUpdate.stopTimeUpdate?.map(update => ({
                stop_id: update.stopId || '',
                arrival_time: update.arrival?.time?.toString() || '',
                departure_time: update.departure?.time?.toString() || '',
                schedule_relationship: update.scheduleRelationship || '',
                delay: (update.arrival?.delay || 0).toString()
            })) || [];

            const tripData = {
                trip_id: tripId,
                route_id: tripUpdate.trip?.routeId || '',
                schedule_relationship: tripUpdate.trip?.scheduleRelationship || '',
                timestamp: tripUpdate.timestamp?.toString() || Date.now().toString(),
                delay: (tripUpdate.delay || 0).toString(),
                vehicle_id: tripUpdate.vehicle?.id || '',
                stop_updates: JSON.stringify(stopTimeUpdates)
            };

            await client.hSet(`trip_update:${tripId}`, tripData);
            await client.expire(`trip_update:${tripId}`, 3600);
            count++;
        }
    }
    console.log(`Processed ${count} trip updates`);
}

async function processAlerts(decodedData) {
    let count = 0;
    for (const entity of decodedData.entity) {
        if (entity.alert) {
            const alert = entity.alert;
            const alertId = entity.id || `alert_${Date.now()}`;

            const alertData = {
                id: alertId,
                effect: alert.effect || '',
                header_text: alert.headerText?.translation?.[0]?.text || '',
                description_text: alert.descriptionText?.translation?.[0]?.text || '',
                start_time: alert.activePeriod?.[0]?.start?.toString() || '',
                end_time: alert.activePeriod?.[0]?.end?.toString() || '',
                severity_level: alert.severityLevel || '',
                informed_entity: JSON.stringify(alert.informedEntity || []),
                timestamp: Date.now().toString()
            };

            await client.hSet(`alert:${alertId}`, alertData);
            await client.sAdd('active_alerts', alertId);
            count++;
        }
    }
    console.log(`Processed ${count} service alerts`);
}

async function fetchGtfsRtData() {
    try {
        if (!client.isOpen) {
            console.error('Redis client is not connected');
            return;
        }

        const root = await loadSchema();
        const FeedMessage = root.lookupType('transit_realtime.FeedMessage');

        // Process all feeds in parallel
        await Promise.all([
            // Vehicle Positions
            fetchAndDecodeFeed(FEEDS.vehiclePositions, FeedMessage)
                .then(data => processVehiclePositions(data))
                .catch(error => console.error('Error processing vehicle positions:', error)),

            // Trip Updates
            fetchAndDecodeFeed(FEEDS.tripUpdates, FeedMessage)
                .then(data => processTripUpdates(data))
                .catch(error => console.error('Error processing trip updates:', error)),

            // Service Alerts
            fetchAndDecodeFeed(FEEDS.alerts, FeedMessage)
                .then(data => processAlerts(data))
                .catch(error => console.error('Error processing alerts:', error))
        ]);

        // Single summary log after all feeds are processed
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] GTFS-RT feed update completed`);
    } catch (error) {
        console.error('Error in fetchGtfsRtData:', error);
        throw error;
    }
}

async function main() {
    try {
        console.log('Starting initial GTFS-RT fetch...');
        await fetchGtfsRtData();
        
        // Update every 30 seconds
        setInterval(fetchGtfsRtData, 30000);
    } catch (error) {
        console.error('Application error:', error);
        process.exit(1);
    }
}

process.on('SIGINT', async () => {
    console.log('Gracefully shutting down...');
    await client.quit();
    process.exit(0);
});

main().catch(error => {
    console.error('Application error:', error);
    process.exit(1);
});
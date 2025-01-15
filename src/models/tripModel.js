// src/models/tripModel.js
import mongoose from 'mongoose';

const stopTimeSchema = new mongoose.Schema({
    arrival_time: { type: String, required: true },
    departure_time: { type: String, required: true },
    stop_sequence: { type: Number, required: true },
    pickup_type: Number,
    drop_off_type: Number
}, { _id: false });

const stopSchema = new mongoose.Schema({
    stop_id: { type: String, required: true },
    stop_name: String,
    stop_lat: Number,
    stop_lon: Number,
    location_type: Number,
    wheelchair_boarding: Number,
    zone_id: String,
    stop_times: [stopTimeSchema]
}, { _id: false });

const tripSchema = new mongoose.Schema({
    trip_id: { type: String, required: true },
    service_id: { type: String, required: true },
    trip_headsign: String,
    direction_id: Number,
    stops: [stopSchema]
}, { 
    collection: 'trips'
});


// Indexes for trips collection
// 1. Primary key index - for direct trip lookups
tripSchema.index({ trip_id: 1 }, { unique: true });

// 2. Route index - for finding all trips of a route
// Also includes service_id for filtering by service day
tripSchema.index({ route_id: 1, service_id: 1 });

// 3. Stops index - for finding trips that serve a particular stop
// Includes trip_id for uniqueness and stop_sequence for sorting
tripSchema.index({ 
    'stops.stop_id': 1, 
    trip_id: 1, 
    'stops.stop_times.stop_sequence': 1 
});


const Trip = mongoose.model('Trip', tripSchema);
export default Trip;

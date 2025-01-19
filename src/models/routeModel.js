import mongoose from 'mongoose';

// Define the trip schema
const tripSchema = new mongoose.Schema({
    trip_id: { type: String, required: true },
    service_id: { type: String, required: true },
    trip_headsign: String,
    direction_id: { type: Number, default: 0 },
    wheelchair_accessible: { type: Number, default: 0 }
}, { _id: false });

// Define the route schema
const routeSchema = new mongoose.Schema({
    route_id: { type: String, required: true },
    agency_id: String,
    route_short_name: String,
    route_long_name: String,
    route_type: Number,
    route_color: String,
    route_text_color: String,
    trips: [tripSchema]  // This will be an array of trip objects
}, { 
    collection: 'routes'
});


// Index for finding specific trips

routeSchema.index({ route_id: 1 }, { unique: true });
routeSchema.index({ 'trips.trip_id': 1 });

const Route = mongoose.model('Route', routeSchema);
export default Route;
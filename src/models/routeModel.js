import mongoose from 'mongoose';

const routeSchema = new mongoose.Schema({
    route_id: { type: String, required: true },
    agency_id: String,
    route_short_name: String,
    route_long_name: String,
    route_type: Number,
    route_url: String,
    route_color: String,
    route_text_color: String
}, { 
    collection: 'routes',  // Explicitly set collection name
    strict: false 
});

// Add this for debugging
routeSchema.pre('save', function(next) {
    console.log('Saving route:', this);
    next();
});

const Route = mongoose.model('Route', routeSchema);

export default Route;
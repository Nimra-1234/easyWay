import mongoose from 'mongoose';

const stopTimeSchema = new mongoose.Schema({
    arrival_time: String,
    departure_time: String,
    pickup_type: Number,
    drop_off_type: Number
}, { _id: false });

const stopSchema = new mongoose.Schema({
    stop_id: { type: String, required: true, unique: true },  // This automatically creates a unique index
    stop_name: String,
    stop_lat: Number,
    stop_lon: Number,
    location_type: Number,
    stop_times: [stopTimeSchema]
}, { _id: false });

const Stop = mongoose.model('Stop', stopSchema);

export default Stop;
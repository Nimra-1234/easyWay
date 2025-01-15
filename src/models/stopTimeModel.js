import mongoose from 'mongoose';

const stopTimeSchema = new mongoose.Schema({
    arrival_time: { type: String, required: true },
    departure_time: { type: String, required: true },
    stop_sequence: { type: Number, required: true },
    pickup_type: Number,
    drop_off_type: Number
}, { _id: false });



export default stopTimeSchema;
// src/models/stopModel.js
import mongoose from 'mongoose';
import stopTimeSchema from './stopTimeModel.js';

const stopSchema = new mongoose.Schema({
    stop_id: { type: String, required: true },
    stop_name: String,
    stop_desc: String,
    stop_lat: Number,
    stop_lon: Number,
    location_type: Number,
    wheelchair_boarding: Number,
    zone_id: String,
    stop_times: [stopTimeSchema]
}, { _id: false });  // Added _id: false to prevent duplicate _id fields

export default stopSchema;

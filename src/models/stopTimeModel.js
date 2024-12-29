
// models/StopTime.js
import mongoose from 'mongoose';

const stopTimeSchema = new mongoose.Schema({
  trip_id: String,
  arrival_time: String,
  departure_time: String,
  stop_id: String,
  stop_sequence: Number,
  stop_headsign: String,
  pickup_type: Number,
  drop_off_type: Number,
  shape_dist_traveled: Number
}, { strict: false });

export default mongoose.model('StopTime', stopTimeSchema);



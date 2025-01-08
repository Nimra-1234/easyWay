import mongoose from 'mongoose';

const stopTimeSchema = new mongoose.Schema({
  trip_id: { type: String, required: true, index: true },
  arrival_time: { type: String, required: true },
  departure_time: { type: String, required: true },
  stop_sequence: { type: Number, required: true },
  // Embed stop information
  stop_info: {
    stop_id: { type: String, required: true, index: true },
    stop_name: String,
    stop_lat: Number,
    stop_lon: Number,
    zone_id: String,
    location_type: Number
  }
}, { 
  strict: false,
  timestamps: true 
});

stopTimeSchema.index({ trip_id: 1, stop_sequence: 1 });
stopTimeSchema.index({ "stop_info.stop_id": 1, arrival_time: 1 });
stopTimeSchema.index({ arrival_time: 1 });

const StopTime = mongoose.model('StopTime', stopTimeSchema);

export default StopTime;
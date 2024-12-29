import mongoose from 'mongoose';

const stopSchema = new mongoose.Schema({
  stop_id: String,
  stop_code: String,
  stop_name: String,
  stop_desc: String,
  stop_lat: Number,
  stop_lon: Number,
  zone_id: String,
  stop_url: String,
  location_type: Number,
  parent_station: String
}, { strict: false });

export default mongoose.model('Stop', stopSchema);

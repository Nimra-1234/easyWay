// // models/Trip.js
// import mongoose from 'mongoose';

// const tripSchema = new mongoose.Schema({
//   route_id: String,
//   service_id: String,
//   trip_id: String,
//   trip_headsign: String,
//   trip_short_name: String,
//   direction_id: Number,
//   block_id: String,
//   shape_id: String,
//   wheelchair_accessible: String,
//   exceptional: String
// }, { strict: false });

// export default mongoose.model('Trip', tripSchema);


import mongoose from 'mongoose';

const tripSchema = new mongoose.Schema({
  trip_id: { type: String, required: true, index: true },
  route_id: { type: String, required: true, index: true },
  service_id: { type: String, required: true },
  trip_headsign: String,
  direction_id: Number,
  shape_id: String,
  // Embed route information for frequently accessed fields
  route_info: {
    route_short_name: String,
    route_long_name: String,
    route_type: Number
  }
}, { 
  strict: false,
  timestamps: true 
});
tripSchema.index({ route_id: 1, service_id: 1 });

const Trip = mongoose.model('Trip', tripSchema);

export default Trip;
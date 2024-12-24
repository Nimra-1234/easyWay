
import mongoose from 'mongoose';

const calendarSchema = new mongoose.Schema({
  service_id: String,
  date: String,
  exception_type: String
}, { strict: false });

export default mongoose.model('Calendar', calendarSchema);

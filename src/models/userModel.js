import mongoose from 'mongoose';

// Define the user schema
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  taxCode: {
    type: String,
    required: true,
    unique: true, // Ensures each user has a unique tax code
    match: [/^[a-zA-Z0-9]{14}$/, 'Tax code must be exactly 14 characters long and include only letters and numbers.'],
  },
  contact: {
    type: String,
    required: true,
    match: [/^\S+@\S+\.\S+$/, 'Contact must be a valid email address'], // Validate email format
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const User = mongoose.model('User', userSchema);

export default User;

// src/models/User.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  taxCode: {
    type: String,
    required: true,
    unique: true,
    match: /^[a-zA-Z0-9]{14}$/
  },
  name: {
    type: String,
    required: true
  },
  contact: {
    type: String,
    required: true,
    unique: true,
    match: /^\S+@\S+\.\S+$/
  },
  totalTickets: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date
  }
});

const User = mongoose.model('User', userSchema);

export default User;
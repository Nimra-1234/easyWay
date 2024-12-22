import { MongoClient } from 'mongodb';

const url = 'mongodb://localhost:27017';  // URL for MongoDB connection (use your database URL)
const dbName = 'your_database_name';      // Name of the database you're connecting to

let db;

export const connectDB = async () => {
  if (db) return db; // If already connected, return the existing connection

  const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });
  await client.connect();
  console.log('Connected to MongoDB!');
  db = client.db(dbName);
  return db;
};

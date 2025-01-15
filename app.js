import express, { json } from 'express';
import { connectMongoDB} from './src/config/mongoDb.js';
import cors from 'cors';
import userRoutes from './src/routes/userRoutes.js';
import routeRoutes from './src/routes/routeRoutes.js';  // Import route routes
import tripRoutes from './src/routes/tripRoutes.js';    // Import trip routes
import stopRoutes from './src/routes/stopRoutes.js';   // Import stop routes
import ticketRoutes from './src/routes/ticketRoutes.js';
import vehicleRoutes from './src/routes/vehicleRoutes.js';
import tripUpdateRoutes from './src/routes/tripUpdateRoutes.js';
import gtfsRoutes from './src/routes/gtfsRoutes.js';
import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';

const app = express();

// Enable CORS for all routes
app.use(cors());

// Middleware to parse incoming JSON requests
app.use(json());
connectMongoDB();

// Register user and booking routes
app.use('/api/users', userRoutes);
app.use('/api/tickets', ticketRoutes);

// In your main app.js or index.js

app.use('/api/gtfs', gtfsRoutes);

// Register GTFS routes
app.use('/api/routes', routeRoutes);  // Register route routes under /api/routes
app.use('/api/trips', tripRoutes);    // Register trip routes under /api/trips
app.use('/api/stops', stopRoutes);    // Register stop routes under /api/stops
app.use('/api', vehicleRoutes); 
app.use('/api/trip-update', tripUpdateRoutes);
app.disable('etag');

// Swagger setup
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Ticketing System API',
      version: '1.0.0',
      description: 'API documentation for the Ticketing System application',
    },
    servers: [
      {
        url: 'http://localhost:3000',
      },
    ],
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js'],  // Adjust this based on your file structure
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

// Serve Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  swaggerOptions: {
    docExpansion: 'none', // Make sure docs do not expand automatically
    deepLinking: true,
    // Disable cache in Swagger UI
    cache: false,
  }
}));

// Handle 404 (Route not found)
app.use((req, res, next) => {
  res.status(404).send({ error: "Route not found" });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ error: 'Something broke!' });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
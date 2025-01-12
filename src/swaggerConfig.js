import express from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';

// Initialize the express app
const app = express();

// Swagger setup
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'EasyWay System API',
    version: '1.0.0',
    description: 'API documentation for the ticketing system',
  },
  tags: [
    {
      name: 'User Management',
      description: 'User-related operations'
    },
    {
      name: 'Ticketing',
      description: 'Ticket-related operations'
    },
    {
      name: 'Trips',
      description: 'Trip-related operations'
    }
  ],
};

const options = {
  swaggerDefinition,
  apis: ['./src/routes/*.js'], // This should point to your route files
};

// Initialize swagger-jsdoc
const swaggerSpec = swaggerJSDoc(options);

// Setup Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});

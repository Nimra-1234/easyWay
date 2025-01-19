import express from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';

const app = express();

// Swagger setup
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'EasyWay System API',
    version: '1.0.0',
    description: 'API documentation for the ticketing system',
  },
  components: {
    securitySchemes: {
      adminAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'admin-code',
        description: 'Admin authentication code'
      }
    }
  },
  security: [], // Empty by default - security will be defined at endpoint level
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
    },
    {
      name: 'Admin',
      description: 'Administrative operations (Requires admin authentication)'
    }
  ]
};

const options = {
  swaggerDefinition,
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);

// Custom options for swagger UI
const swaggerUiOptions = {
  swaggerOptions: {
    persistAuthorization: true,
    authAction: {
      adminAuth: {
        name: "adminAuth",
        schema: {
          type: "apiKey",
          in: "header",
          name: "admin-code",
          description: "Admin authentication code"
        },
        value: "your-admin-code"
      }
    }
  }
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
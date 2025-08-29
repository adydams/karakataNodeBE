const swaggerAutogen = require('swagger-autogen')();
// const swag = require('./routes/userRoutes')

const doc = {
  info: {
    version: '1.0', // by default: '1.0.0'
    title: 'Karakata API', // by default: 'REST API'
    description: 'Karakata API Backend API Documentation' // by default: ''
  },
  host: 'localhost:2468', // by default: 'localhost:3000'
  basePath: '/api/v1/users', // by default: '/'
  schemes: ['http'], // by default: ['http']
  consumes: ['application/json'], // by default: ['application/json']
  produces: ['application/json'], // by default: ['application/json']
  tags: [
    // by default: empty Array
    {
      name: '', // Tag name
      description: '' // Tag description
    }
    // { ... }
  ],
  securityDefinitions: {}, // by default: empty object
  definitions: {}, // by default: empty object (Swagger 2.0)
  components: {} // by default: empty object (OpenAPI 3.x)
};

const outputFile = './swagger-output.json';
const endpointsFiles = ['./routes/userRoutes.js', './routes/productRoutes.js'];

swaggerAutogen(outputFile, endpointsFiles, doc);

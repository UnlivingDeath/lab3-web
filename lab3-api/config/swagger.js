const path = require('node:path');
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'RESTful API Documentation - Web & Database Lab 3',
            version: '1.0.0',
            description: 'Interactive documentation for the product, category, and orders APIs'
        },
        servers: [{
            url: 'http://localhost:3000/api',
            description: 'Local API'
        }],
        components: {
            parameters: {
                idParam: {
                    in: 'path',
                    name: 'id',
                    required: true,
                    schema: { type: 'string' },
                    description: 'The resource ID'
                }
            }
        }
    },
    apis: [path.join(__dirname, '../routes/*.js').split(path.sep).join('/')]
};

const swaggerSpec = swaggerJSDoc(options);

const setupSwagger = (app) => {
    app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};

module.exports = setupSwagger;

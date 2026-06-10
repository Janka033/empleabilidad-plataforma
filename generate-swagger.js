// generate-swagger.js
const swaggerJSDoc = require('swagger-jsdoc');
const fs = require('fs');
const yaml = require('yamljs');
const path = require('path');

// Configuración base de OpenAPI
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'EmpleoUni API',
            version: '1.0.0',
            description: 'API para la plataforma de empleabilidad estudiantil',
        },
        servers: [
            {
                url: 'http://localhost:3001',
                description: 'Servidor local - Auth Service',
            },
            {
                url: 'http://localhost:3002',
                description: 'Servidor local - Perfiles Service',
            },
            {
                url: 'http://localhost:3003',
                description: 'Servidor local - Vacantes Service',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [{ bearerAuth: [] }],
    },
    // Apunta a todos los archivos de rutas y controladores donde tienes anotaciones @swagger
    apis: [
        './ms-auth/src/routes/*.js',
        './ms-auth/src/controllers/*.js',
        './ms-perfiles/src/routes/*.js',
        './ms-perfiles/src/controllers/*.js',
        './ms-vacantes/src/routes/*.js',
        './ms-vacantes/src/controllers/*.js',
    ],
};

// Generar el objeto OpenAPI
const swaggerSpec = swaggerJSDoc(options);

// Guardar como JSON (opcional)
fs.writeFileSync('./openapi.json', JSON.stringify(swaggerSpec, null, 2));

// Guardar como YAML
const yamlString = yaml.stringify(swaggerSpec, 4);
fs.writeFileSync('./openapi.yaml', yamlString);

console.log('✅ Archivos generados: openapi.json y openapi.yaml');
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "ms-auth — EmpleoUni",
            version: "1.0.0",
            description: "API de autenticación: registro e inicio de sesión con JWT",
        },
        servers: [{ url: `http://localhost:${process.env.PORT || 3001}` }],
        components: {
            securitySchemes: {
                bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
            },
        },
    },
    apis: ["./src/controllers/*.js"],
};

const specs = swaggerJsdoc(options);

module.exports = { specs, swaggerUi };

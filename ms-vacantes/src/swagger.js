const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const specs = swaggerJsdoc({
    definition: {
        openapi: "3.0.0",
        info: { title: "ms-vacantes — EmpleoUni", version: "1.0.0" },
        servers: [{ url: `http://localhost:${process.env.PORT || 3003}` }],
        components: {
            securitySchemes: {
                bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
            },
        },
    },
    apis: ["./src/controllers/*.js"],
});

module.exports = { specs, swaggerUi };

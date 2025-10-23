const express = require('express');
const cors = require('cors');

const registerRoutes = require('./routes');

const createApp = () => {
    const app = express();

    app.use(cors());
    app.use(express.json());

    registerRoutes(app);

    return app;
};

module.exports = createApp;

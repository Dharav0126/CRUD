const mongoose = require('mongoose');

// Import dotenv
require('dotenv').config();

const configuration = {
    ConnectionString: {
        MongoDB: process.env.MONGOURL // Update this line to use the correct environment variable name
    }
};

module.exports = configuration;
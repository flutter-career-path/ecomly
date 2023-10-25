const bodyParser = require('body-parser');
const express = require('express');
const morgan = require('morgan');
const mongoose = require('mongoose');
require('dotenv/config');

const env = process.env;
const app = express();

// MIDDLEWARES
app.use(bodyParser.json());
app.use(morgan('tiny'));

// ROUTES

// SERVER && DATABASE
PORT = env.PORT;
IP = env.IP;

mongoose
  .connect(env.CONNECTION_STRING)
  .then(() => {
    console.log('Connected to the database');
  })
  .catch((err) => {
    console.log(err);
  });

app.listen(PORT, IP, () => {
  console.log(`Server running on http://${IP}:${PORT}`);
});

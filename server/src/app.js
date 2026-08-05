require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({
  origin: process.env.CLIENT_ORIGIN,
  credentials: true,
}));
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/boards', require('./routes/boards'));
app.use('/api/columns', require('./routes/columns'));
app.use('/api/cards', require('./routes/cards'));
app.use('/api/cards/:cardId/prs', require('./routes/prs'));
app.use('/api/activity', require('./routes/activity'));
app.use('/api/recommendations', require('./routes/recommendations'));

module.exports = app;

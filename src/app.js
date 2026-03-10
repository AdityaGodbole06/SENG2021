require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const receiptAdviceRoutes = require('./routes/receiptAdvice');
const despatchAdviceRoutes = require('./routes/despatchAdvice');
const app = express();
app.use(express.json());

connectDB();

app.use('/receipt-advices', receiptAdviceRoutes);
app.use('/despatch-advices',despatchAdviceRoutes);
app.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on port ${process.env.PORT || 3000}`);
});

module.exports = app;

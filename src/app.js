require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const { authMiddleware } = require('./middleware/auth');
const receiptAdviceRoutes = require('./routes/receiptAdvice');
const despatchAdviceRoutes = require('./routes/despatchAdvice');
const app = express();
app.use(express.json());

connectDB();

app.use('/api/despatch-advices', authMiddleware, despatchAdviceRoutes);
app.use('/api/receipt-advices', authMiddleware, receiptAdviceRoutes);

app.get('/api/test', authMiddleware, (req, res) => {
    res.status(200).json({
        message: 'API authentication works',
        authenticatedParty: req.party
    });
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on port ${process.env.PORT || 3000}`);
});

module.exports = app;

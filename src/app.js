require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const { authMiddleware } = require('./middleware/auth');

const receiptAdviceRoutes = require('./routes/receiptAdvice');
const despatchAdviceRoutes = require('./routes/despatchAdvice');
const orderAdjustmentRoutes = require('./routes/orderAdjustmentRoute');
const fulfilmentCancellationRoutes = require('./routes/fulfilmentCancellation');

const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

const app = express();
app.use(express.json());
connectDB();

app.use('/api/despatch-advices', authMiddleware, despatchAdviceRoutes);
app.use('/api/receipt-advices', authMiddleware, receiptAdviceRoutes);
app.use('/api/order-adjustments', authMiddleware, orderAdjustmentRoutes);
app.use('/api/fulfilment-cancellations', authMiddleware, fulfilmentCancellationRoutes);

app.get('/api/test', authMiddleware, (req, res) => {
    res.status(200).json({
        message: 'API authentication works',
        authenticatedParty: req.party
    });
});

// === Swagger UI ===
const swaggerDocument = YAML.load('./swagger.yaml');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on port ${process.env.PORT || 3000}`);
});

module.exports = app;
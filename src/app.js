require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
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

app.get('/health', async (req, res) => {
    const dbState = mongoose.connection.readyState;
    // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
    if (dbState === 1) {
        res.status(200).json({ status: 'ok', db: 'connected', uptime: process.uptime() });
    } else {
        res.status(503).json({ status: 'unhealthy', db: 'disconnected', uptime: process.uptime() });
    }
});

app.get('/', (_req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SpicyPotatoes API</title>
    <style>
        body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f9f9f9; }
        h1 { font-size: 2rem; }
        p { color: #555; }
        #health { font-weight: bold; margin: 1rem 0; }
        a { color: #2563eb; text-decoration: none; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <h1>SpicyPotatoes API</h1>
    <p>Category 2 — Despatch Document Management</p>
    <p id="health">Loading...</p>
    <a href="/api-docs">View API Documentation (Swagger)</a>
    <script>
        fetch('/health')
            .then(r => r.json())
            .then(data => {
                document.getElementById('health').textContent = 'API Response: ' + JSON.stringify(data);
            });
    </script>
</body>
</html>`);
});

app.get('/api/test', authMiddleware, (req, res) => {
    res.status(200).json({
        message: 'API authentication works',
        authenticatedParty: req.party
    });
});

// === Swagger UI ===
const path = require('path');
const swaggerDocument = YAML.load(path.join(__dirname, '../swagger.yaml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on port ${process.env.PORT || 3000}`);
});

module.exports = app;
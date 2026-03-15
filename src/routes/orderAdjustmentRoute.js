const express = require('express');
const router = express.Router();
const OrderAdjustment = require('../models/OrderAdjustment');
const orderAdjustmentService = require('../services/orderAdjustmentService');

const service = new orderAdjustmentService();

// POST /order-adjustment
router.post('/', async (req, res) => {
    try {
        const adjustment = await service.createAdjustment(req.body);
        return res.status(201).json(adjustment);
    } catch (err) {
        return res.status(400).json({ error: err.message});
    }
});

// Get /order-adjustment/:id
router.get('/:id', async (req,res) => {
    try {
        const adjustment = await OrderAdjustment.findOne({ orderAdjustmentId: req.params.id });
        if (!adjustment) {
            return res.status(404).json({ error: `Order adjustment ${req.params.id} not found` });
        }

        return res.status(200).json(adjustment);
    } catch (err) {
        return res.status(500).json({ error: err.message});
    }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const OrderAdjustment = require('../models/OrderAdjustment');
const orderAdjustmentService = require('../services/orderAdjustmentService');

const service = new orderAdjustmentService();

// GET /order-adjustments - list all adjustments visible to this party
router.get('/', async (req, res) => {
  try {
    const filter = req.party
      ? { requestedByPartyId: req.party.partyId }
      : {}
    const adjustments = await OrderAdjustment.find(filter).sort({ createdAt: -1 })
    return res.status(200).json({ total: adjustments.length, adjustments })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
})

// POST /order-adjustment
// Only DELIVERY_PARTY can create adjustments
router.post('/', async (req, res) => {
    if (req.party?.role !== 'DELIVERY_PARTY') {
        return res.status(403).json({ error: 'Only a DELIVERY_PARTY can create order adjustments' });
    }

    try {
        const adjustment = await service.createAdjustment(req.body);
        return res.status(201).json(adjustment);
    } catch (err) {
        return res.status(err.statusCode || 500).json({ error: err.message });
    }
});

// GET /order-adjustment/:id
// Both parties can read adjustments
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
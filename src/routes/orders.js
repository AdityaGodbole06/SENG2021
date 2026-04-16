const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const Order = require('../models/Order');
const AuditService = require('../services/auditService');
const { generateOrderXML } = require('../utils/ublGenerator');

const auditService = new AuditService();

// POST /orders - Create order (authenticated users)
router.post('/', async (req, res) => {
  if (!req.party) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { orderNumber, buyerParty, sellerParty, amount, orderDate, deliveryDate } = req.body;

    // Validate required fields
    if (!orderNumber || !buyerParty || !sellerParty || amount === undefined) {
      await auditService.log(
        'CREATE_ORDER',
        'ORDER',
        orderNumber || 'NEW',
        req.party.partyId,
        {},
        'Failed to create order - missing required fields',
        'failure',
        'Missing required fields'
      );

      return res.status(400).json({
        error: 'Missing required fields: orderNumber, buyerParty, sellerParty, amount',
      });
    }

    // Check if order number already exists
    const existingOrder = await Order.findOne({ orderNumber });
    if (existingOrder) {
      await auditService.log(
        'CREATE_ORDER',
        'ORDER',
        orderNumber,
        req.party.partyId,
        {},
        'Failed to create order - duplicate order number',
        'failure',
        'Order number already exists'
      );

      return res.status(409).json({ error: 'Order number already exists' });
    }

    // Generate UBL XML
    const xmlDocument = generateOrderXML({
      orderNumber,
      buyerParty,
      sellerParty,
      amount,
      orderDate: orderDate || new Date(),
      deliveryDate,
    });

    // Create order
    const order = new Order({
      orderNumber,
      orderID: `ORD-${uuidv4()}`,
      buyerParty,
      sellerParty,
      amount,
      orderDate: orderDate || new Date(),
      deliveryDate,
      partyId: req.party.partyId,
      xmlDocument,
      isGuest: false,
      status: 'pending',
    });

    await order.save();

    await auditService.log(
      'CREATE_ORDER',
      'ORDER',
      orderNumber,
      req.party.partyId,
      { amount, buyerParty, sellerParty },
      `Order created: ${orderNumber}`
    );

    res.status(201).json({
      message: 'Order created successfully',
      order: {
        orderNumber: order.orderNumber,
        orderID: order.orderID,
        buyerParty: order.buyerParty,
        sellerParty: order.sellerParty,
        amount: order.amount,
        status: order.status,
        xmlDocument: order.xmlDocument,
      },
    });
  } catch (error) {
    console.error('Error creating order:', error);
    await auditService.log(
      'CREATE_ORDER',
      'ORDER',
      'NEW',
      req.party?.partyId || 'UNKNOWN',
      {},
      'Failed to create order',
      'failure',
      error.message
    );

    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /orders/guest - Create guest order (no authentication required)
// Returns UBL XML without saving to database
router.post('/guest/create', async (req, res) => {
  try {
    const { orderNumber, buyerParty, sellerParty, amount, orderDate, deliveryDate } = req.body;

    // Validate required fields
    if (!orderNumber || !buyerParty || !sellerParty || amount === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: orderNumber, buyerParty, sellerParty, amount',
      });
    }

    // Generate UBL XML
    const xmlDocument = generateOrderXML({
      orderNumber,
      buyerParty,
      sellerParty,
      amount,
      orderDate: orderDate || new Date(),
      deliveryDate,
    });

    // Return XML directly without saving
    res.status(200).json({
      message: 'Guest order UBL document generated successfully',
      ubl: xmlDocument,
      xmlDocument,
      note: 'This order was not saved to the database. Please store this XML for your records.',
    });
  } catch (error) {
    console.error('Error generating guest order:', error);
    res.status(500).json({ error: 'Failed to generate guest order' });
  }
});

// GET /orders - List all orders for authenticated user
router.get('/', async (req, res) => {
  if (!req.party) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const orders = await Order.find({ partyId: req.party.partyId }).sort({ createdAt: -1 });

    res.status(200).json({
      total: orders.length,
      orders: orders.map((order) => ({
        orderNumber: order.orderNumber,
        orderID: order.orderID,
        buyerParty: order.buyerParty,
        sellerParty: order.sellerParty,
        amount: order.amount,
        status: order.status,
        orderDate: order.orderDate,
        deliveryDate: order.deliveryDate,
        createdAt: order.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /orders/:orderNumber - Get specific order
router.get('/:orderNumber', async (req, res) => {
  if (!req.party) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const order = await Order.findOne({
      orderNumber: req.params.orderNumber,
      partyId: req.party.partyId,
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.status(200).json({
      orderNumber: order.orderNumber,
      orderID: order.orderID,
      buyerParty: order.buyerParty,
      sellerParty: order.sellerParty,
      amount: order.amount,
      status: order.status,
      orderDate: order.orderDate,
      deliveryDate: order.deliveryDate,
      xmlDocument: order.xmlDocument,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /orders/:orderNumber - Update order (amendment)
router.put('/:orderNumber', async (req, res) => {
  if (!req.party) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { buyerParty, sellerParty, amount, orderDate, deliveryDate } = req.body;

    const order = await Order.findOne({
      orderNumber: req.params.orderNumber,
      partyId: req.party.partyId,
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Track changes for audit log
    const changes = {};
    const oldValues = {};

    if (buyerParty && buyerParty !== order.buyerParty) {
      changes.buyerParty = buyerParty;
      oldValues.buyerParty = order.buyerParty;
      order.buyerParty = buyerParty;
    }

    if (sellerParty && sellerParty !== order.sellerParty) {
      changes.sellerParty = sellerParty;
      oldValues.sellerParty = order.sellerParty;
      order.sellerParty = sellerParty;
    }

    if (amount !== undefined && amount !== order.amount) {
      changes.amount = amount;
      oldValues.amount = order.amount;
      order.amount = amount;
    }

    if (orderDate && orderDate !== order.orderDate) {
      changes.orderDate = orderDate;
      oldValues.orderDate = order.orderDate;
      order.orderDate = orderDate;
    }

    if (deliveryDate && deliveryDate !== order.deliveryDate) {
      changes.deliveryDate = deliveryDate;
      oldValues.deliveryDate = order.deliveryDate;
      order.deliveryDate = deliveryDate;
    }

    // Regenerate XML if any changes were made
    if (Object.keys(changes).length > 0) {
      order.xmlDocument = generateOrderXML({
        orderNumber: order.orderNumber,
        buyerParty: order.buyerParty,
        sellerParty: order.sellerParty,
        amount: order.amount,
        orderDate: order.orderDate,
        deliveryDate: order.deliveryDate,
      });
    }

    await order.save();

    await auditService.log(
      'UPDATE_ORDER',
      'ORDER',
      req.params.orderNumber,
      req.party.partyId,
      { changes, oldValues },
      `Order amended: ${req.params.orderNumber}`
    );

    res.status(200).json({
      message: 'Order updated successfully',
      order: {
        orderNumber: order.orderNumber,
        buyerParty: order.buyerParty,
        sellerParty: order.sellerParty,
        amount: order.amount,
        status: order.status,
        xmlDocument: order.xmlDocument,
      },
    });
  } catch (error) {
    console.error('Error updating order:', error);
    await auditService.log(
      'UPDATE_ORDER',
      'ORDER',
      req.params.orderNumber,
      req.party?.partyId || 'UNKNOWN',
      {},
      'Failed to update order',
      'failure',
      error.message
    );

    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /orders/:orderNumber - Delete order
router.delete('/:orderNumber', async (req, res) => {
  if (!req.party) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const order = await Order.findOneAndDelete({
      orderNumber: req.params.orderNumber,
      partyId: req.party.partyId,
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    await auditService.log(
      'DELETE_ORDER',
      'ORDER',
      req.params.orderNumber,
      req.party.partyId,
      { amount: order.amount, buyerParty: order.buyerParty },
      `Order deleted: ${req.params.orderNumber}`
    );

    res.status(200).json({
      message: 'Order deleted successfully',
      orderNumber: order.orderNumber,
    });
  } catch (error) {
    console.error('Error deleting order:', error);
    await auditService.log(
      'DELETE_ORDER',
      'ORDER',
      req.params.orderNumber,
      req.party?.partyId || 'UNKNOWN',
      {},
      'Failed to delete order',
      'failure',
      error.message
    );

    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

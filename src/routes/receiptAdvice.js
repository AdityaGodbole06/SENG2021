const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const ReceiptAdvice = require('../models/ReceiptAdvice');
const DespatchAdvice = require('../models/DespatchAdvice');
const OrderAdjustment = require('../models/OrderAdjustment');
const { generateReceiptAdviceXML } = require('../utils/ublGenerator');

// POST /receipt-advices
// Returns UBL 2.1 XML
router.post('/', async (req, res) => {
  try {
  const { dispatchAdviceId, receiptDate, receivedItems, notes } = req.body;

  if (!dispatchAdviceId || !receiptDate || !receivedItems) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Missing required fields',
        details: [
          ...(!dispatchAdviceId ? ['dispatchAdviceId is required'] : []),
          ...(!receiptDate ? ['receiptDate is required'] : []),
          ...(!receivedItems ? ['receivedItems is required'] : []),
        ],
      },
    });
  }

  const invalidItem = receivedItems.find((item) => item.quantityReceived < 0);
  if (invalidItem) {
    return res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid quantity',
        details: [`quantityReceived cannot be negative for SKU: ${invalidItem.sku}`],
      },
    });
  }

  const despatchAdvice = await DespatchAdvice.findOne({ dispatchAdviceId });
  if (!despatchAdvice) {
    return res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Despatch Advice not found',
        details: [`dispatchAdviceId ${dispatchAdviceId} does not exist`],
      },
    });
  }

  if (!['SENT', 'IN_TRANSIT'].includes(despatchAdvice.status)) {
    const messages = {
      CREATED: 'Cannot submit Receipt Advice for a Despatch Advice that has not been sent yet',
      DELIVERED: 'A Receipt Advice has already been submitted for this Despatch Advice',
      CANCELLED: 'Cannot submit Receipt Advice for a cancelled Despatch Advice',
    };
    return res.status(409).json({
      error: {
        code: 'CONFLICT',
        message: 'Invalid state',
        details: [messages[despatchAdvice.status] || 'Despatch Advice is not in a receivable state'],
      },
    });
  }

  const receiptAdviceId = `RA-${uuidv4()}`;

  const xmlDocument = generateReceiptAdviceXML({
    receiptAdviceId,
    dispatchAdviceId,
    receiptDate,
    receivedItems,
    notes,
  });

  const receiptAdvice = new ReceiptAdvice({
    receiptAdviceId,
    dispatchAdviceId,
    receiptDate,
    receivedItems,
    notes,
    xmlDocument,
  });

  await receiptAdvice.save();

  // Compare received quantities against dispatched quantities per SKU
  const dispatchedMap = {};
  for (const item of despatchAdvice.items) {
    dispatchedMap[item.sku] = item.quantity;
  }

  const discrepancies = receivedItems.filter(
    (item) => dispatchedMap[item.sku] !== undefined && item.quantityReceived !== dispatchedMap[item.sku]
  );

  if (discrepancies.length > 0) {
    const adjustment = new OrderAdjustment({
      orderAdjustmentId: `OA-${uuidv4()}`,
      dispatchAdviceId,
      requestedByPartyId: despatchAdvice.deliveryParty.partyId,
      reason: 'Quantity discrepancy between dispatched and received items',
      adjustments: discrepancies.map((item) => ({
        sku: item.sku,
        field: 'QUANTITY',
        from: dispatchedMap[item.sku],
        to: item.quantityReceived,
      })),
    });

    await adjustment.save();
    despatchAdvice.adjustments.push(adjustment._id);
  }

  despatchAdvice.status = 'DELIVERED';
  await despatchAdvice.save();

  res.set('Content-Type', 'application/xml');
  return res.status(201).send(xmlDocument);
  } catch (err) {
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: err.message },
    });
  }
});

// GET /receipt-advices/:receiptAdviceId
// Retrieves the UBL XML Receipt Advice
router.get('/:receiptAdviceId', async (req, res) => {
  const receiptAdvice = await ReceiptAdvice.findOne({
    receiptAdviceId: req.params.receiptAdviceId,
  });

  if (!receiptAdvice) {
    return res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Receipt Advice not found',
        details: [`receiptAdviceId ${req.params.receiptAdviceId} does not exist`],
      },
    });
  }

  res.set('Content-Type', 'application/xml');
  return res.status(200).send(receiptAdvice.xmlDocument);
});

module.exports = router;

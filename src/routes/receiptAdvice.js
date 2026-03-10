const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const ReceiptAdvice = require('../models/ReceiptAdvice');
const DespatchAdvice = require('../models/DespatchAdvice');
const { generateReceiptAdviceXML } = require('../utils/ublGenerator');

// POST /receipt-advices
// Returns UBL 2.1 XML
router.post('/', async (req, res) => {
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

  if (despatchAdvice.status === 'CREATED') {
    return res.status(409).json({
      error: {
        code: 'CONFLICT',
        message: 'Invalid state',
        details: ['Cannot submit Receipt Advice for a Despatch Advice that has not been sent yet'],
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

  res.set('Content-Type', 'application/xml');
  return res.status(201).send(xmlDocument);
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

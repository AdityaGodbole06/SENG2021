const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const DespatchAdvice = require('../models/DespatchAdvice');
const { generateDespatchAdviceXML } = require('../utils/ublGenerator');

// POST /despatch-advices
router.post('/', async (req, res) => {
  const { externalRef, despatchParty, deliveryParty, dispatchDate, expectedDeliveryDate, items } = req.body;

  if (!despatchParty || !deliveryParty || !dispatchDate || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Missing required fields',
        details: [
          ...(!despatchParty ? ['despatchParty is required'] : []),
          ...(!deliveryParty ? ['deliveryParty is required'] : []),
          ...(!dispatchDate ? ['dispatchDate is required'] : []),
          ...( !items || !Array.isArray(items) || items.length === 0 ? ['items must be a non-empty array'] : []),
        ],
      },
    });
  }


  const invalidItem = items.find((item) => item.quantity < 1);
  if (invalidItem) {
    return res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid quantity',
        details: [`quantity must be >= 1 for SKU: ${invalidItem.sku}`],
      },
    });
  }

  const despatchAdviceId = `DA-${uuidv4()}`;

  const xmlDocument = generateDespatchAdviceXML({
    despatchAdviceId,
    externalRef,
    despatchParty,
    deliveryParty,
    dispatchDate,
    expectedDeliveryDate,
    items,
  });

  const despatchAdvice = new DespatchAdvice({
    dispatchAdviceId: despatchAdviceId,
    externalRef,
    despatchParty,
    deliveryParty,
    dispatchDate,
    expectedDeliveryDate,
    items,
    xmlDocument,
    status: 'CREATED',
  });

  await despatchAdvice.save();

  res.set('Content-Type', 'application/xml');
  return res.status(201).send(xmlDocument);
});


router.get('/:dispatchAdviceId', async (req, res) => {
  const despatchAdvice = await DespatchAdvice.findOne({ dispatchAdviceId: req.params.dispatchAdviceId });

  if (!despatchAdvice) {
    return res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Despatch Advice not found',
        details: [`dispatchAdviceId ${req.params.dispatchAdviceId} does not exist`],
      },
    });
  }

  res.set('Content-Type', 'application/xml');
  return res.status(200).send(despatchAdvice.xmlDocument);
});

module.exports = router;
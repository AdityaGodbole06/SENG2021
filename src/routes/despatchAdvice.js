const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const DespatchAdvice = require('../models/DespatchAdvice');
const { generateDespatchAdviceXML } = require('../utils/ublGenerator');
const AuditService = require('../services/auditService');

const auditService = new AuditService();

// GET /despatch-advices - list all
router.get('/', async (req, res) => {
  try {
    const filter = req.party ? {
      $or: [
        { 'despatchParty.partyId': req.party.partyId },
        { 'deliveryParty.partyId': req.party.partyId },
      ],
    } : {}
    const advices = await DespatchAdvice.find(filter).sort({ createdAt: -1 })
    res.status(200).json({
      total: advices.length,
      despatchAdvices: advices.map(d => ({
        dispatchAdviceId: d.dispatchAdviceId,
        externalRef: d.externalRef,
        despatchParty: d.despatchParty,
        deliveryParty: d.deliveryParty,
        dispatchDate: d.dispatchDate,
        expectedDeliveryDate: d.expectedDeliveryDate,
        status: d.status,
        items: d.items,
        createdAt: d.createdAt,
      })),
    })
  } catch (err) {
    console.error('Error listing despatch advices:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /despatch-advices
router.post('/', async (req, res) => {
  if (req.party && req.party.role !== 'DESPATCH_PARTY') {
    return res.status(403).json({ error: 'Only a DESPATCH_PARTY can create a Despatch Advice' });
  }

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
    status: 'SENT',
  });

  await despatchAdvice.save();

  // Log to audit trail
  await auditService.log(
    'CREATE_DESPATCH',
    'DESPATCH',
    despatchAdviceId,
    req.party?.partyId || 'SYSTEM',
    { despatchParty, deliveryParty, itemCount: items.length },
    `Despatch Advice created: ${despatchAdviceId}`
  );

  res.set('Content-Type', 'application/xml');
  return res.status(201).send(xmlDocument);
});


// PATCH /despatch-advices/:dispatchAdviceId/status - manual status progression
const ALLOWED_TRANSITIONS = {
  CREATED: ['SENT', 'CANCELLED'],
  SENT: ['IN_TRANSIT', 'DELIVERED', 'CANCELLED'],
  IN_TRANSIT: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

router.patch('/:dispatchAdviceId/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'status is required' },
      });
    }

    const despatchAdvice = await DespatchAdvice.findOne({
      dispatchAdviceId: req.params.dispatchAdviceId,
    });

    if (!despatchAdvice) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Despatch Advice not found' },
      });
    }

    if (req.party && req.party.role !== 'DESPATCH_PARTY') {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Only a DESPATCH_PARTY can update dispatch status' },
      });
    }

    if (req.party && despatchAdvice.despatchParty.partyId !== req.party.partyId) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'You can only update dispatches you created' },
      });
    }

    const allowed = ALLOWED_TRANSITIONS[despatchAdvice.status] || [];
    if (!allowed.includes(status)) {
      return res.status(409).json({
        error: {
          code: 'INVALID_TRANSITION',
          message: `Cannot transition from ${despatchAdvice.status} to ${status}`,
          details: [`Allowed next states: ${allowed.join(', ') || 'none'}`],
        },
      });
    }

    const previousStatus = despatchAdvice.status;
    despatchAdvice.status = status;
    await despatchAdvice.save();

    await auditService.log(
      'UPDATE_DESPATCH_STATUS',
      'DESPATCH',
      despatchAdvice.dispatchAdviceId,
      req.party?.partyId || 'SYSTEM',
      { from: previousStatus, to: status },
      `Despatch ${despatchAdvice.dispatchAdviceId} status: ${previousStatus} → ${status}`
    );

    return res.status(200).json({
      dispatchAdviceId: despatchAdvice.dispatchAdviceId,
      status: despatchAdvice.status,
      previousStatus,
    });
  } catch (err) {
    console.error('Error updating despatch status:', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: err.message },
    });
  }
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
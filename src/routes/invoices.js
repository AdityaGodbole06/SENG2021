const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const AuditService = require('../services/auditService');

const auditService = new AuditService();

function mapInvoice(inv) {
  return {
    id: inv._id.toString(),
    invoiceNumber: inv.invoiceNumber,
    orderId: inv.orderId || '',
    buyerParty: inv.buyerParty,
    sellerParty: inv.sellerParty,
    totalAmount: inv.totalAmount,
    invoiceDate: inv.invoiceDate ? inv.invoiceDate.toISOString().split('T')[0] : '',
    dueDate: inv.dueDate ? inv.dueDate.toISOString().split('T')[0] : '',
    status: inv.status,
  };
}

// GET /api/invoices
router.get('/', async (req, res) => {
  try {
    const filter = req.party
      ? { $or: [{ buyerParty: req.party.partyId }, { sellerParty: req.party.partyId }] }
      : {};
    const invoices = await Invoice.find(filter).sort({ createdAt: -1 });
    res.json({ total: invoices.length, invoices: invoices.map(mapInvoice) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// POST /api/invoices
router.post('/', async (req, res) => {
  try {
    const { invoiceNumber, orderId, buyerParty, sellerParty, totalAmount, invoiceDate, dueDate } = req.body;

    if (!buyerParty || !sellerParty || !invoiceDate) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields',
          details: [
            ...(!buyerParty ? ['buyerParty is required'] : []),
            ...(!sellerParty ? ['sellerParty is required'] : []),
            ...(!invoiceDate ? ['invoiceDate is required'] : []),
          ],
        },
      });
    }

    const number = invoiceNumber || `INV-${Date.now()}`;

    const invoice = new Invoice({
      invoiceNumber: number,
      orderId,
      buyerParty,
      sellerParty,
      totalAmount: parseFloat(totalAmount) || 0,
      invoiceDate: new Date(invoiceDate),
      dueDate: dueDate ? new Date(dueDate) : undefined,
      status: 'unpaid',
    });

    await invoice.save();

    await auditService.log(
      'CREATE_INVOICE',
      'INVOICE',
      number,
      req.party?.partyId || 'SYSTEM',
      { buyerParty, sellerParty, totalAmount },
      `Invoice created: ${number}`
    );

    res.status(201).json(mapInvoice(invoice));
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Invoice number already exists' });
    }
    res.status(500).json({ error: err.message || 'Failed to create invoice' });
  }
});

// GET /api/invoices/:id
router.get('/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json(mapInvoice(invoice));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

// PATCH /api/invoices/:id
router.patch('/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json(mapInvoice(invoice));
  } catch (err) {
    res.status(500).json({ error: 'Failed to update invoice' });
  }
});

// DELETE /api/invoices/:id
router.delete('/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndDelete(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json({ message: 'Invoice deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete invoice' });
  }
});

module.exports = router;

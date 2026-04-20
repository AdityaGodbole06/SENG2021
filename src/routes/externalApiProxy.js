const express = require('express');
const axios = require('axios');
const router = express.Router();
const ReceiptAdvice = require('../models/ReceiptAdvice');
const DespatchAdvice = require('../models/DespatchAdvice');
const AuditService = require('../services/auditService');
const Invoice = require('../models/Invoice');
const Order = require('../models/Order');

const auditService = new AuditService();

// Middleware to extract user credentials from request headers
function getCredentialsFromRequest(req) {
  return {
    chalksnifferKey: req.headers['x-chalksniffer-key'],
    gptlessToken: req.headers['x-gptless-token'],
    despatchToken: req.headers['authorization']?.replace('Bearer ', ''),
  };
}

// Proxy for Orders (Chalksniffer)
router.post('/orders', async (req, res) => {
  try {
    const { chalksnifferKey } = getCredentialsFromRequest(req);

    if (!chalksnifferKey) {
      return res.status(401).json({ error: 'Missing Chalksniffer credentials' });
    }

    const response = await axios.post(
      'https://www.chalksniffer.com/orders',
      req.body,
      {
        headers: {
          'X-API-Key': chalksnifferKey,
          'Content-Type': 'application/json',
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Orders proxy error:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to create order',
      details: error.response?.data || error.message,
    });
  }
});

router.get('/orders', async (req, res) => {
  try {
    const { chalksnifferKey } = getCredentialsFromRequest(req);

    if (!chalksnifferKey) {
      return res.status(401).json({ error: 'Missing Chalksniffer credentials' });
    }

    const response = await axios.get(
      'https://www.chalksniffer.com/orders',
      {
        headers: {
          'X-API-Key': chalksnifferKey,
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Orders list proxy error:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch orders',
      details: error.response?.data || error.message,
    });
  }
});

// Proxy for Dispatch (13.236.86.146)
router.post('/dispatch', async (req, res) => {
  try {
    const { despatchToken } = getCredentialsFromRequest(req);

    if (!despatchToken) {
      return res.status(401).json({ error: 'Missing Despatch API credentials' });
    }

    const response = await axios.post(
      'http://13.236.86.146:3000/api/despatch-advices',
      req.body,
      {
        headers: {
          'Authorization': `Bearer ${despatchToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Dispatch proxy error:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to create dispatch advice',
      details: error.response?.data || error.message,
    });
  }
});

router.get('/dispatch', async (req, res) => {
  try {
    const { despatchToken } = getCredentialsFromRequest(req);

    if (!despatchToken) {
      return res.status(401).json({ error: 'Missing Despatch API credentials' });
    }

    const response = await axios.get(
      'http://13.236.86.146:3000/api/despatch-advices',
      {
        headers: {
          'Authorization': `Bearer ${despatchToken}`,
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Dispatch list proxy error:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch dispatch advices',
      details: error.response?.data || error.message,
    });
  }
});

// Proxy for Invoices (GPTless)
router.post('/invoices', async (req, res) => {
  try {
    const { gptlessToken } = getCredentialsFromRequest(req);

    if (!gptlessToken) {
      return res.status(401).json({ error: 'Missing GPTless credentials' });
    }

    const {
      orderId,
      invoiceNumber,
      invoiceDate,
      dueDate,
      totalAmount,
      buyerParty,
      sellerParty,
      buyerABN,
      sellerABN,
      dispatchAdviceId,
    } = req.body;

    // Validate fulfillment before generating invoice
    if (dispatchAdviceId) {
      const despatch = await DespatchAdvice.findOne({ dispatchAdviceId });
      if (!despatch) {
        return res.status(404).json({
          error: 'Fulfillment validation failed',
          details: 'Despatch Advice not found',
        });
      }
      const receipt = await ReceiptAdvice.findOne({ dispatchAdviceId });
      if (!receipt) {
        return res.status(409).json({
          error: 'Fulfillment validation failed',
          details: 'Cannot generate invoice without a submitted Receipt Advice. Fulfillment must be completed first.',
        });
      }
    }

    const amount = parseFloat(totalAmount) || 0;
    const gptlessBody = {
      InvoiceData: {
        supplier: { name: sellerParty || 'Supplier', ABN: sellerABN || '00000000000' },
        customer: { name: buyerParty || 'Buyer', ABN: buyerABN || '00000000000' },
        issueDate: invoiceDate,
        dueDate: dueDate || invoiceDate,
        totalAmount: amount,
        currency: 'AUD',
        lines: [
          {
            lineId: '1',
            description: orderId ? `Order: ${orderId}` : 'Invoice Line',
            quantity: 1,
            unitPrice: amount,
            lineTotal: amount,
          },
        ],
      },
    };

    const response = await axios.post(
      'https://api.gptless.au/v1/invoices/generate',
      gptlessBody,
      {
        headers: {
          APIToken: gptlessToken,
          'Content-Type': 'application/json',
        },
      }
    );

    // Extract invoice ID from XML response
    const xmlData = typeof response.data === 'string' ? response.data : '';
    const idMatch = xmlData.match(/<cbc:ID>(\d+)<\/cbc:ID>/);
    const gptlessId = idMatch ? idMatch[1] : `GPT-${Date.now()}`;
    const finalInvoiceNumber = invoiceNumber || `INV-${gptlessId}`;

    // Store metadata in MongoDB for listing
    let savedInvoice;
    try {
      savedInvoice = new Invoice({
        invoiceNumber: finalInvoiceNumber,
        orderId: orderId || '',
        buyerParty: buyerParty || 'Buyer',
        sellerParty: sellerParty || 'Supplier',
        totalAmount: amount,
        invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : null,
        status: 'unpaid',
        gptlessId,
        xmlDocument: xmlData || '',
      });
      await savedInvoice.save();
    } catch (saveErr) {
      console.error('Failed to save invoice metadata:', saveErr.message);
    }

    // Update linked order status to invoiced
    if (orderId) {
      await Order.findOneAndUpdate(
        { orderNumber: orderId, status: { $nin: ['invoiced', 'paid', 'cancelled'] } },
        { status: 'invoiced' }
      );
    }

    res.status(201).json({
      id: savedInvoice?._id?.toString() || gptlessId,
      invoiceNumber: finalInvoiceNumber,
      orderId: orderId || '',
      buyerParty: buyerParty || 'Buyer',
      sellerParty: sellerParty || 'Supplier',
      totalAmount: amount,
      invoiceDate: invoiceDate,
      dueDate: dueDate,
      status: 'unpaid',
      gptlessId,
    });
  } catch (error) {
    console.error('Invoices proxy error:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to generate invoice',
      details: error.response?.data || error.message,
    });
  }
});

router.patch('/invoices/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    // Update linked order status to paid
    if (req.body.status === 'paid' && invoice.orderId) {
      await Order.findOneAndUpdate(
        { orderNumber: invoice.orderId, status: { $ne: 'cancelled' } },
        { status: 'paid' }
      );
    }

    res.json({
      id: invoice._id.toString(),
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update invoice', details: error.message });
  }
});

router.get('/invoices', async (req, res) => {
  try {
    const { gptlessToken } = getCredentialsFromRequest(req);

    if (!gptlessToken) {
      return res.status(401).json({ error: 'Missing GPTless credentials' });
    }

    // Filter invoices by the authenticated party
    const filter = req.party
      ? { $or: [{ buyerParty: req.party.partyId }, { sellerParty: req.party.partyId },
                { buyerParty: req.party.name }, { sellerParty: req.party.name }] }
      : {};
    const invoices = await Invoice.find(filter).sort({ createdAt: -1 });
    const mapped = invoices.map(inv => ({
      id: inv._id.toString(),
      invoiceNumber: inv.invoiceNumber,
      orderId: inv.orderId || '',
      buyerParty: inv.buyerParty,
      sellerParty: inv.sellerParty,
      totalAmount: inv.totalAmount,
      invoiceDate: inv.invoiceDate?.toISOString().split('T')[0] || '',
      dueDate: inv.dueDate?.toISOString().split('T')[0] || '',
      status: inv.status,
    }));

    res.json(mapped);
  } catch (error) {
    console.error('Invoices list proxy error:', error.message);
    res.status(500).json({
      error: 'Failed to fetch invoices',
      details: error.message,
    });
  }
});

// GET /invoices/:id/xml - return stored UBL XML, falling back to GPTless fetch
router.get('/invoices/:id/xml', async (req, res) => {
  try {
    const { gptlessToken } = getCredentialsFromRequest(req);
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (invoice.xmlDocument) {
      res.set('Content-Type', 'application/xml');
      res.set('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.xml"`);
      return res.send(invoice.xmlDocument);
    }

    if (!invoice.gptlessId || !gptlessToken) {
      return res.status(404).json({ error: 'No UBL XML available for this invoice' });
    }

    const response = await axios.get(
      `https://api.gptless.au/v1/invoices/${invoice.gptlessId}`,
      { headers: { APIToken: gptlessToken } }
    );

    const xml = typeof response.data === 'string' ? response.data : '';
    if (xml) {
      invoice.xmlDocument = xml;
      await invoice.save();
    }

    res.set('Content-Type', 'application/xml');
    res.set('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.xml"`);
    return res.send(xml);
  } catch (error) {
    console.error('Invoice XML fetch error:', error.message);
    return res.status(error.response?.status || 500).json({
      error: 'Failed to fetch invoice XML',
      details: error.response?.data || error.message,
    });
  }
});

router.delete('/invoices/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndDelete(req.params.id);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.json({ message: 'Invoice deleted', id: req.params.id });
  } catch (error) {
    console.error('Invoice delete error:', error.message);
    res.status(500).json({ error: 'Failed to delete invoice', details: error.message });
  }
});

module.exports = router;

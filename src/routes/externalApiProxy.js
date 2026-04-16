const express = require('express');
const axios = require('axios');
const router = express.Router();

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

    const response = await axios.post(
      'https://api.gptless.au/v1/invoices/generate',
      req.body,
      {
        headers: {
          'APIToken': gptlessToken,
          'Content-Type': 'application/json',
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Invoices proxy error:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to generate invoice',
      details: error.response?.data || error.message,
    });
  }
});

router.get('/invoices', async (req, res) => {
  try {
    const { gptlessToken } = getCredentialsFromRequest(req);

    if (!gptlessToken) {
      return res.status(401).json({ error: 'Missing GPTless credentials' });
    }

    const response = await axios.get(
      'https://api.gptless.au/v1/invoices',
      {
        headers: {
          'APIToken': gptlessToken,
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Invoices list proxy error:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch invoices',
      details: error.response?.data || error.message,
    });
  }
});

module.exports = router;

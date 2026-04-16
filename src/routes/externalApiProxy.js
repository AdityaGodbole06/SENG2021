const express = require('express');
const axios = require('axios');
const router = express.Router();

// Store API credentials in memory (in production, use database or secure config)
let apiCredentials = {
  chalksniffer: null,
  gptless: null,
  despatch: null,
};

// Initialize/register with all three external APIs
router.post('/setup', async (req, res) => {
  try {
    console.log('Setting up external API credentials...');

    // 1. Register with Chalksniffer
    console.log('Registering with Chalksniffer...');
    const chalksnifferRes = await axios.post('https://www.chalksniffer.com/auth/register');
    apiCredentials.chalksniffer = chalksnifferRes.data.apiKey || chalksnifferRes.data.key;
    console.log('Chalksniffer key obtained');

    // 2. Register with GPTless
    console.log('Registering with GPTless...');
    const gptlessRes = await axios.post('https://api.gptless.au/v1/auth/register',
      { groupName: 'DigitalBook' },
      { headers: { APIToken: 'developer' } }
    );
    apiCredentials.gptless = gptlessRes.data.apiToken || gptlessRes.data.token;
    console.log('GPTless token obtained');

    // 3. Despatch API - use local bearer token for now
    apiCredentials.despatch = process.env.DESPATCH_API_TOKEN || 'setup-required';

    res.json({
      status: 'setup-complete',
      message: 'All external APIs registered',
      credentials: {
        chalksniffer: !!apiCredentials.chalksniffer,
        gptless: !!apiCredentials.gptless,
        despatch: !!apiCredentials.despatch,
      },
    });
  } catch (error) {
    console.error('Setup error:', error.message);
    res.status(500).json({
      error: 'Setup failed',
      details: error.message,
    });
  }
});

// Proxy for Orders (Chalksniffer)
router.post('/orders', async (req, res) => {
  try {
    if (!apiCredentials.chalksniffer) {
      return res.status(400).json({ error: 'Chalksniffer not initialized. Call /api/proxy/setup first' });
    }

    const response = await axios.post(
      'https://www.chalksniffer.com/orders',
      req.body,
      {
        headers: {
          'X-API-Key': apiCredentials.chalksniffer,
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
    if (!apiCredentials.chalksniffer) {
      return res.status(400).json({ error: 'Chalksniffer not initialized' });
    }

    const response = await axios.get(
      'https://www.chalksniffer.com/orders',
      {
        headers: {
          'X-API-Key': apiCredentials.chalksniffer,
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
    const response = await axios.post(
      'http://13.236.86.146:3000/api/despatch-advices',
      req.body,
      {
        headers: {
          'Authorization': `Bearer ${apiCredentials.despatch}`,
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
    const response = await axios.get(
      'http://13.236.86.146:3000/api/despatch-advices',
      {
        headers: {
          'Authorization': `Bearer ${apiCredentials.despatch}`,
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
    if (!apiCredentials.gptless) {
      return res.status(400).json({ error: 'GPTless not initialized. Call /api/proxy/setup first' });
    }

    const response = await axios.post(
      'https://api.gptless.au/v1/invoices/generate',
      req.body,
      {
        headers: {
          'APIToken': apiCredentials.gptless,
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
    if (!apiCredentials.gptless) {
      return res.status(400).json({ error: 'GPTless not initialized' });
    }

    const response = await axios.get(
      'https://api.gptless.au/v1/invoices',
      {
        headers: {
          'APIToken': apiCredentials.gptless,
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

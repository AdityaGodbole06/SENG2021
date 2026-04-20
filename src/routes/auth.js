const express = require('express');
const bcrypt = require('bcrypt');
const axios = require('axios');
const Party = require('../models/Party');

const router = express.Router();

// Helper function to register with external APIs
async function registerWithExternalAPIs() {
  const credentials = {};

  try {
    // Register with Chalksniffer
    console.log('Registering with Chalksniffer...');
    const chalkRes = await axios.post('https://www.chalksniffer.com/auth/register');
    credentials.chalksnifferKey = chalkRes.data.apiKey || chalkRes.data.key;
    console.log('Chalksniffer key obtained');
  } catch (error) {
    console.error('Chalksniffer registration error:', error.message);
    credentials.chalksnifferKey = null;
  }

  try {
    // Register with GPTless
    console.log('Registering with GPTless...');
    const gptRes = await axios.post(
      'https://api.gptless.au/v1/auth/register',
      { groupName: 'DigitalBook' },
      { headers: { APIToken: 'developer' } }
    );
    credentials.gptlessToken = gptRes.data.apiToken || gptRes.data.token;
    console.log('GPTless token obtained');
  } catch (error) {
    console.error('GPTless registration error:', error.message);
    credentials.gptlessToken = null;
  }

  return credentials;
}

// Register a new party (user)
router.post('/register', async (req, res) => {
  try {
    const { partyId, name, password, role } = req.body;

    // Validate input
    if (!partyId || !name || !password || !role) {
      return res.status(400).json({
        error: 'Missing required fields: partyId, name, password, role',
      });
    }

    // Validate role
    if (!['DESPATCH_PARTY', 'DELIVERY_PARTY'].includes(role)) {
      return res.status(400).json({
        error: 'Invalid role. Must be DESPATCH_PARTY or DELIVERY_PARTY',
      });
    }

    // Check if party already exists
    const existingParty = await Party.findOne({ partyId });
    if (existingParty) {
      return res.status(409).json({
        error: 'Party with this ID already exists',
      });
    }

    // Register with external APIs
    console.log('Registering with external APIs...');
    const externalCredentials = await registerWithExternalAPIs();

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create new party with external API credentials
    const newParty = new Party({
      partyId,
      name,
      passwordHash,
      role,
      chalksnifferKey: externalCredentials.chalksnifferKey,
      gptlessToken: externalCredentials.gptlessToken,
    });

    await newParty.save();

    res.status(201).json({
      message: 'Party registered successfully',
      token: partyId,
      party: {
        partyId: newParty.partyId,
        name: newParty.name,
        role: newParty.role,
      },
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({
      error: 'Internal server error during registration',
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { partyId, password } = req.body;

    // Validate input
    if (!partyId || !password) {
      return res.status(400).json({
        error: 'Missing required fields: partyId, password',
      });
    }

    // Find party
    const party = await Party.findOne({ partyId });
    if (!party) {
      return res.status(401).json({
        error: 'Invalid partyId or password',
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, party.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid partyId or password',
      });
    }

    res.status(200).json({
      message: 'Login successful',
      token: party.partyId,
      party: {
        partyId: party.partyId,
        name: party.name,
        role: party.role,
      },
      // Include API credentials for frontend to use in proxy
      apiCredentials: {
        chalksnifferKey: party.chalksnifferKey,
        gptlessToken: party.gptlessToken || process.env.GPTLESS_DEV_TOKEN,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({
      error: 'Internal server error during login',
    });
  }
});

module.exports = router;

const express = require('express');
const bcrypt = require('bcrypt');
const Party = require('../models/Party');

const router = express.Router();

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

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create new party
    const newParty = new Party({
      partyId,
      name,
      passwordHash,
      role,
    });

    await newParty.save();

    res.status(201).json({
      message: 'Party registered successfully',
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
      token: party.partyId, // In real scenario, use JWT
      party: {
        partyId: party.partyId,
        name: party.name,
        role: party.role,
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

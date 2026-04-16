const mongoose = require('mongoose');

const partySchema = new mongoose.Schema(
  {
    partyId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['DESPATCH_PARTY', 'DELIVERY_PARTY'],
      required: true,
    },
    // External API credentials
    chalksnifferKey: { type: String, default: null },
    gptlessToken: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Party', partySchema);

const mongoose = require('mongoose');

const supplySchema = new mongoose.Schema(
  {
    sku: { type: String, required: true },
    despatchPartyId: { type: String, required: true },
    description: { type: String },
    uom: { type: String, required: true },
    totalQuantity: { type: Number, required: true, min: 0 },
    allocatedQuantity: { type: Number, default: 0, min: 0 },
    availableQuantity: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['AVAILABLE', 'ALLOCATED', 'OUT_OF_STOCK'],
      default: 'AVAILABLE',
    },
  },
  { timestamps: true }
);

supplySchema.index({ sku: 1, despatchPartyId: 1 }, { unique: true });

module.exports = mongoose.model('Supply', supplySchema);

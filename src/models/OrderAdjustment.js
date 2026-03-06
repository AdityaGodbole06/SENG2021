const mongoose = require('mongoose');

const adjustmentLineSchema = new mongoose.Schema({
  sku: { type: String, required: true },
  field: { type: String, required: true },
  from: { type: Number, required: true },
  to: { type: Number, required: true, min: 1 },
}, { _id: false });

const orderAdjustmentSchema = new mongoose.Schema(
  {
    orderAdjustmentId: { type: String, required: true, unique: true },
    dispatchAdviceId: { type: String, required: true, ref: 'DespatchAdvice' },
    requestedByPartyId: { type: String, required: true },
    reason: { type: String, required: true },
    adjustments: { type: [adjustmentLineSchema], required: true },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('OrderAdjustment', orderAdjustmentSchema);

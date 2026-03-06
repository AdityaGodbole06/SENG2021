const mongoose = require('mongoose');

const fulfilmentCancellationSchema = new mongoose.Schema(
  {
    fulfilmentCancellationId: { type: String, required: true, unique: true },
    dispatchAdviceId: { type: String, required: true, ref: 'DespatchAdvice' },
    requestedByPartyId: { type: String, required: true },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ['CANCELLED'],
      default: 'CANCELLED',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FulfilmentCancellation', fulfilmentCancellationSchema);

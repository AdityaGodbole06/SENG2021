const mongoose = require('mongoose');

const adjustmentLineSchema = new mongoose.Schema({
  sku: { type: String, required: true },
  field: { type: String, required: true,
    enum: ['QUANTITY', 'DESCRIPTION', 'UNIT']
   },
  from: { type: mongoose.Schema.Types.Mixed, required: true },
  to: { type: Number, required: true, min: 0 },
}, { _id: false });

const orderAdjustmentSchema = new mongoose.Schema(
  {
    orderAdjustmentId: { type: String, required: true, unique: true },
    dispatchAdviceId: { type: String, required: true, ref: 'DespatchAdvice' },
    requestedByPartyId: { type: String, required: true },
    reason: { type: String, required: true },
    adjustments: { type: [adjustmentLineSchema], required: true,
      validate: { validator: function(v) {
          return v && v.length > 0;
        },
        message: 'Adjustment required'
      }  
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
      index: true
    },
  },
  { timestamps: true }
);

orderAdjustmentSchema.index({ despatchAdviceId: 1, status: 1});
orderAdjustmentSchema.index({ createdAt: -1});
module.exports = mongoose.model('OrderAdjustment', orderAdjustmentSchema);

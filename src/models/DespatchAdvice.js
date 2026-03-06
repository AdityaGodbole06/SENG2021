const mongoose = require('mongoose');

const partySchema = new mongoose.Schema({
  partyId: { type: String, required: true },
  name: { type: String, required: true },
}, { _id: false });

const lineItemSchema = new mongoose.Schema({
  sku: { type: String, required: true },
  description: { type: String },
  quantity: { type: Number, required: true, min: 1 },
  uom: { type: String, required: true },
}, { _id: false });

const despatchAdviceSchema = new mongoose.Schema(
  {
    dispatchAdviceId: { type: String, required: true, unique: true },
    externalRef: { type: String, required: true },
    despatchParty: { type: partySchema, required: true },
    deliveryParty: { type: partySchema, required: true },
    dispatchDate: { type: Date, required: true },
    expectedDeliveryDate: { type: Date },
    items: { type: [lineItemSchema], required: true },
    status: {
      type: String,
      enum: ['CREATED', 'SENT', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'],
      default: 'CREATED',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DespatchAdvice', despatchAdviceSchema);

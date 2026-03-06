const mongoose = require('mongoose');

const receivedItemSchema = new mongoose.Schema({
  sku: { type: String, required: true },
  quantityReceived: { type: Number, required: true, min: 0 },
  uom: { type: String, required: true },
}, { _id: false });

const receiptAdviceSchema = new mongoose.Schema(
  {
    receiptAdviceId: { type: String, required: true, unique: true },
    dispatchAdviceId: { type: String, required: true, ref: 'DespatchAdvice' },
    receiptDate: { type: Date, required: true },
    receivedItems: { type: [receivedItemSchema], required: true },
    notes: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ReceiptAdvice', receiptAdviceSchema);

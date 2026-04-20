const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    orderId: { type: String },
    buyerParty: { type: String, required: true },
    sellerParty: { type: String, required: true },
    totalAmount: { type: Number, required: true, default: 0 },
    invoiceDate: { type: Date, required: true },
    dueDate: { type: Date },
    status: {
      type: String,
      enum: ['unpaid', 'paid', 'overdue', 'cancelled'],
      default: 'unpaid',
    },
    gptlessId: { type: String },
    xmlDocument: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Invoice', invoiceSchema);

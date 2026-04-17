const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true,
  },
  orderID: {
    type: String,
    unique: true,
    sparse: true,
  },
  buyerParty: {
    type: String,
    required: true,
  },
  sellerParty: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  orderDate: {
    type: Date,
    default: Date.now,
  },
  deliveryDate: {
    type: Date,
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'dispatched', 'delivered', 'cancelled'],
    default: 'pending',
  },
  partyId: {
    type: String,
    required: true,
  },
  xmlDocument: {
    type: String,
    default: null,
  },
  isGuest: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt timestamp before saving
OrderSchema.pre('save', async function() {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('Order', OrderSchema);

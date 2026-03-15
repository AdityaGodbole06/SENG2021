/**
 * System Tests
 *
 * These tests verify complete end-to-end workflows across multiple routes,
 * simulating real interactions between a DESPATCH_PARTY and a DELIVERY_PARTY.
 */

require('dotenv').config();
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = require('../app');
const Party = require('../models/Party');
const DespatchAdvice = require('../models/DespatchAdvice');
const ReceiptAdvice = require('../models/ReceiptAdvice');
const OrderAdjustment = require('../models/OrderAdjustment');
const FulfilmentCancellation = require('../models/FulfilmentCancellation');
const Supply = require('../models/Supply');

describe('System Tests', () => {
  let mongod;
  const despatchPartyId = 'SYS-DESPATCH-001';
  const deliveryPartyId = 'SYS-DELIVERY-001';
  const despatchAuth = `Bearer ${despatchPartyId}`;
  const deliveryAuth = `Bearer ${deliveryPartyId}`;

  const despatchPayload = {
    externalRef: 'SYS-REF-001',
    despatchParty: { partyId: 'SUP-SYS', name: 'System Supplier' },
    deliveryParty: { partyId: 'WH-SYS', name: 'System Warehouse' },
    dispatchDate: new Date().toISOString(),
    expectedDeliveryDate: new Date().toISOString(),
    items: [
      { sku: 'SKU-X', description: 'Widget X', quantity: 10, uom: 'EA' },
      { sku: 'SKU-Y', description: 'Widget Y', quantity: 5, uom: 'EA' },
    ],
  };

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.disconnect();
    await mongoose.connect(mongod.getUri());

    await Party.create([
      { partyId: despatchPartyId, name: 'System Despatch Party', passwordHash: 'hash', role: 'DESPATCH_PARTY' },
      { partyId: deliveryPartyId, name: 'System Delivery Party', passwordHash: 'hash', role: 'DELIVERY_PARTY' },
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await Promise.all(mongoose.connections.map((con) => con.close()));
    if (mongod) await mongod.stop();
  });

  beforeEach(async () => {
    await DespatchAdvice.deleteMany({});
    await ReceiptAdvice.deleteMany({});
    await OrderAdjustment.deleteMany({});
    await FulfilmentCancellation.deleteMany({});
    await Supply.deleteMany({});
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Helper: create a DespatchAdvice via API and return its generated ID
  // ─────────────────────────────────────────────────────────────────────────────
  async function createDespatchAdvice(payload = despatchPayload) {
    await request(app)
      .post('/api/despatch-advices')
      .set('Authorization', despatchAuth)
      .send(payload);
    const da = await DespatchAdvice.findOne({});
    return da.dispatchAdviceId;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Flow 1: Full delivery cycle — quantities match, no adjustment needed
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Flow 1: Full delivery cycle with matching quantities', () => {
    test('DA is created, receipted, and marked DELIVERED with no OrderAdjustment', async () => {
      // Step 1: DESPATCH_PARTY creates a DespatchAdvice
      const daId = await createDespatchAdvice();
      let da = await DespatchAdvice.findOne({ dispatchAdviceId: daId });
      expect(da.status).toBe('SENT');

      // Step 2: DELIVERY_PARTY submits a ReceiptAdvice with matching quantities
      const receiptRes = await request(app)
        .post('/api/receipt-advices')
        .set('Authorization', deliveryAuth)
        .send({
          dispatchAdviceId: daId,
          receiptDate: new Date().toISOString(),
          receivedItems: [
            { sku: 'SKU-X', quantityReceived: 10, uom: 'EA' },
            { sku: 'SKU-Y', quantityReceived: 5, uom: 'EA' },
          ],
        });

      expect(receiptRes.statusCode).toBe(201);
      expect(receiptRes.headers['content-type']).toMatch(/xml/);

      // Step 3: Verify DA is now DELIVERED
      da = await DespatchAdvice.findOne({ dispatchAdviceId: daId });
      expect(da.status).toBe('DELIVERED');

      // Step 4: Verify no OrderAdjustment was created
      const adjustment = await OrderAdjustment.findOne({ dispatchAdviceId: daId });
      expect(adjustment).toBeNull();

      // Step 5: Retrieve the ReceiptAdvice by ID
      const ra = await ReceiptAdvice.findOne({ dispatchAdviceId: daId });
      const getRes = await request(app)
        .get(`/api/receipt-advices/${ra.receiptAdviceId}`)
        .set('Authorization', deliveryAuth);
      expect(getRes.statusCode).toBe(200);
      expect(getRes.headers['content-type']).toMatch(/xml/);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Flow 2: Delivery with quantity discrepancy — auto OrderAdjustment created
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Flow 2: Delivery with quantity discrepancy', () => {
    test('ReceiptAdvice triggers auto-created OrderAdjustment for mismatched SKUs', async () => {
      // Step 1: Create DespatchAdvice (10 of SKU-X, 5 of SKU-Y)
      const daId = await createDespatchAdvice();

      // Step 2: Receipt with SKU-X short (8 instead of 10), SKU-Y matching
      const receiptRes = await request(app)
        .post('/api/receipt-advices')
        .set('Authorization', deliveryAuth)
        .send({
          dispatchAdviceId: daId,
          receiptDate: new Date().toISOString(),
          receivedItems: [
            { sku: 'SKU-X', quantityReceived: 8, uom: 'EA' },
            { sku: 'SKU-Y', quantityReceived: 5, uom: 'EA' },
          ],
        });

      expect(receiptRes.statusCode).toBe(201);

      // Step 3: DA should be DELIVERED
      const da = await DespatchAdvice.findOne({ dispatchAdviceId: daId });
      expect(da.status).toBe('DELIVERED');

      // Step 4: An OrderAdjustment should exist for SKU-X only
      const adjustment = await OrderAdjustment.findOne({ dispatchAdviceId: daId });
      expect(adjustment).not.toBeNull();
      expect(adjustment.adjustments).toHaveLength(1);
      expect(adjustment.adjustments[0].sku).toBe('SKU-X');
      expect(adjustment.adjustments[0].from).toBe(10);
      expect(adjustment.adjustments[0].to).toBe(8);
      expect(adjustment.adjustments[0].field).toBe('QUANTITY');

      // Step 5: Retrieve the adjustment via API
      const getRes = await request(app)
        .get(`/api/order-adjustments/${adjustment.orderAdjustmentId}`)
        .set('Authorization', deliveryAuth);
      expect(getRes.statusCode).toBe(200);
      expect(getRes.body.adjustments[0].sku).toBe('SKU-X');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Flow 3: Fulfilment cancellation — DA cancelled, receipt blocked
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Flow 3: Fulfilment cancellation blocks subsequent receipt', () => {
    test('Cancelled DA cannot be receipted', async () => {
      // Seed supply so inventory adjustment works
      await Supply.create({
        sku: 'SKU-X',
        despatchPartyId: 'SUP-SYS',
        uom: 'EA',
        totalQuantity: 50,
        allocatedQuantity: 10,
        availableQuantity: 40,
        status: 'AVAILABLE',
      });

      // Step 1: Create DespatchAdvice
      const daId = await createDespatchAdvice();

      // Step 2: DESPATCH_PARTY cancels it
      const cancelRes = await request(app)
        .post('/api/fulfilment-cancellations')
        .set('Authorization', despatchAuth)
        .send({
          dispatchAdviceId: daId,
          requestedByPartyId: despatchPartyId,
          reason: 'Supplier error',
        });

      expect(cancelRes.statusCode).toBe(201);

      // Step 3: DA status should be CANCELLED
      const da = await DespatchAdvice.findOne({ dispatchAdviceId: daId });
      expect(da.status).toBe('CANCELLED');

      // Step 4: DELIVERY_PARTY tries to receipt the cancelled DA → 409
      const receiptRes = await request(app)
        .post('/api/receipt-advices')
        .set('Authorization', deliveryAuth)
        .send({
          dispatchAdviceId: daId,
          receiptDate: new Date().toISOString(),
          receivedItems: [{ sku: 'SKU-X', quantityReceived: 10, uom: 'EA' }],
        });

      expect(receiptRes.statusCode).toBe(409);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Flow 4: Manual order adjustment on a SENT DA
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Flow 4: Manual order adjustment before delivery', () => {
    test('DELIVERY_PARTY can create and retrieve an OrderAdjustment on a SENT DA', async () => {
      // Step 1: Create DespatchAdvice
      const daId = await createDespatchAdvice();

      // Step 2: DELIVERY_PARTY raises a manual adjustment
      const adjRes = await request(app)
        .post('/api/order-adjustments')
        .set('Authorization', deliveryAuth)
        .send({
          despatchAdviceId: daId,
          requestedByPartyId: deliveryPartyId,
          reason: 'Packaging damage noted before receipt',
          adjustments: [{ sku: 'SKU-X', field: 'QUANTITY', from: 10, to: 7 }],
        });

      expect(adjRes.statusCode).toBe(201);
      const adjId = adjRes.body.orderAdjustmentId;

      // Step 3: Retrieve the adjustment
      const getRes = await request(app)
        .get(`/api/order-adjustments/${adjId}`)
        .set('Authorization', despatchAuth);

      expect(getRes.statusCode).toBe(200);
      expect(getRes.body.orderAdjustmentId).toBe(adjId);
      expect(getRes.body.adjustments[0].to).toBe(7);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Flow 5: Cannot adjust a DELIVERED DA
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Flow 5: Order adjustment blocked after delivery', () => {
    test('DELIVERY_PARTY cannot adjust an already-delivered DA', async () => {
      // Step 1: Create and receipt the DA
      const daId = await createDespatchAdvice();

      await request(app)
        .post('/api/receipt-advices')
        .set('Authorization', deliveryAuth)
        .send({
          dispatchAdviceId: daId,
          receiptDate: new Date().toISOString(),
          receivedItems: [
            { sku: 'SKU-X', quantityReceived: 10, uom: 'EA' },
            { sku: 'SKU-Y', quantityReceived: 5, uom: 'EA' },
          ],
        });

      const da = await DespatchAdvice.findOne({ dispatchAdviceId: daId });
      expect(da.status).toBe('DELIVERED');

      // Step 2: Try to create an OrderAdjustment → 409
      const adjRes = await request(app)
        .post('/api/order-adjustments')
        .set('Authorization', deliveryAuth)
        .send({
          despatchAdviceId: daId,
          requestedByPartyId: deliveryPartyId,
          reason: 'Late discrepancy noticed',
          adjustments: [{ sku: 'SKU-X', field: 'QUANTITY', from: 10, to: 8 }],
        });

      expect(adjRes.statusCode).toBe(409);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Flow 6: Cannot adjust a CANCELLED DA
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Flow 6: Order adjustment blocked after cancellation', () => {
    test('DELIVERY_PARTY cannot adjust a cancelled DA', async () => {
      await Supply.create({
        sku: 'SKU-X',
        despatchPartyId: 'SUP-SYS',
        uom: 'EA',
        totalQuantity: 50,
        allocatedQuantity: 10,
        availableQuantity: 40,
        status: 'AVAILABLE',
      });

      // Step 1: Create and cancel the DA
      const daId = await createDespatchAdvice();

      await request(app)
        .post('/api/fulfilment-cancellations')
        .set('Authorization', despatchAuth)
        .send({ dispatchAdviceId: daId, requestedByPartyId: despatchPartyId, reason: 'Test' });

      // Step 2: Try to adjust → 409
      const adjRes = await request(app)
        .post('/api/order-adjustments')
        .set('Authorization', deliveryAuth)
        .send({
          despatchAdviceId: daId,
          requestedByPartyId: deliveryPartyId,
          reason: 'Should fail',
          adjustments: [{ sku: 'SKU-X', field: 'QUANTITY', from: 10, to: 5 }],
        });

      expect(adjRes.statusCode).toBe(409);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Flow 7: Role enforcement across the full workflow
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Flow 7: Role enforcement', () => {
    test('DELIVERY_PARTY cannot create a DespatchAdvice', async () => {
      const res = await request(app)
        .post('/api/despatch-advices')
        .set('Authorization', deliveryAuth)
        .send(despatchPayload);
      expect(res.statusCode).toBe(403);
    });

    test('DESPATCH_PARTY cannot submit a ReceiptAdvice', async () => {
      const daId = await createDespatchAdvice();

      const res = await request(app)
        .post('/api/receipt-advices')
        .set('Authorization', despatchAuth)
        .send({
          dispatchAdviceId: daId,
          receiptDate: new Date().toISOString(),
          receivedItems: [{ sku: 'SKU-X', quantityReceived: 10, uom: 'EA' }],
        });
      expect(res.statusCode).toBe(403);
    });

    test('DESPATCH_PARTY cannot create an OrderAdjustment', async () => {
      const daId = await createDespatchAdvice();

      const res = await request(app)
        .post('/api/order-adjustments')
        .set('Authorization', despatchAuth)
        .send({
          despatchAdviceId: daId,
          requestedByPartyId: despatchPartyId,
          reason: 'Should fail',
          adjustments: [{ sku: 'SKU-X', field: 'QUANTITY', from: 10, to: 8 }],
        });
      expect(res.statusCode).toBe(403);
    });

    test('DELIVERY_PARTY cannot create a FulfilmentCancellation', async () => {
      const daId = await createDespatchAdvice();

      const res = await request(app)
        .post('/api/fulfilment-cancellations')
        .set('Authorization', deliveryAuth)
        .send({ dispatchAdviceId: daId, requestedByPartyId: deliveryPartyId, reason: 'Should fail' });
      expect(res.statusCode).toBe(403);
    });

    test('Unauthenticated request is rejected on all routes', async () => {
      const routes = [
        { method: 'post', path: '/api/despatch-advices' },
        { method: 'post', path: '/api/receipt-advices' },
        { method: 'post', path: '/api/order-adjustments' },
        { method: 'post', path: '/api/fulfilment-cancellations' },
      ];

      for (const route of routes) {
        const res = await request(app)[route.method](route.path).send({});
        expect(res.statusCode).toBe(401);
      }
    });
  });
});
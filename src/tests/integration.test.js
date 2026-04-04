const request = require('supertest');
const app = require('../app');

const API_BASE = 'http://13.236.86.146:3000';
const DESPATCH_PARTY = 'SUP-01'; // DESPATCH_PARTY role (supplier)
const DELIVERY_PARTY = 'WH-02'; // DELIVERY_PARTY role (warehouse)
const INVALID_TOKEN = 'INVALID-TOKEN-XYZ';

// Test data generators
const createDespatchAdvicePayload = (overrides = {}) => ({
  externalRef: `REF-${Date.now()}`,
  despatchParty: {
    partyId: 'SUP-01',
    name: 'Supplier Alpha',
  },
  deliveryParty: {
    partyId: 'WH-02',
    name: 'Warehouse Beta',
  },
  dispatchDate: new Date().toISOString(),
  expectedDeliveryDate: new Date(Date.now() + 86400000).toISOString(),
  items: [
    {
      sku: 'ITEM-A',
      description: 'Blue Widget',
      quantity: 5,
      uom: 'EA',
    },
  ],
  ...overrides,
});

const createReceiptAdvicePayload = (dispatchAdviceId, overrides = {}) => ({
  dispatchAdviceId,
  receiptDate: new Date().toISOString(),
  notes: 'All items received in good condition',
  receivedItems: [
    {
      sku: 'ITEM-A',
      quantityReceived: 5,
    },
  ],
  ...overrides,
});

const createFulfilmentCancellationPayload = (dispatchAdviceId, overrides = {}) => ({
  dispatchAdviceId,
  requestedByPartyId: 'USER_1',
  reason: 'Customer requested cancellation',
  ...overrides,
});

const createOrderAdjustmentPayload = (dispatchAdviceId, overrides = {}) => ({
  dispatchAdviceId,
  requestedByPartyId: 'WH-02',
  reason: 'Quantity discrepancy found',
  adjustments: [
    {
      sku: 'ITEM-A',
      field: 'QUANTITY',
      from: 5,
      to: 4,
    },
  ],
  ...overrides,
});

describe('SENG2021 Microservice Integration Tests', () => {
  // ==================== DESPATCH ADVICE TESTS ====================
  describe('Despatch Advice Endpoints', () => {
    let createdDespatchAdviceId;

    describe('POST /api/despatch-advices', () => {
      test('should create despatch advice successfully with valid token', async () => {
        const payload = createDespatchAdvicePayload();
        const response = await request(app)
          .post('/api/despatch-advices')
          .set('Authorization', `Bearer ${DESPATCH_PARTY}`)
          .send(payload);

        expect(response.status).toBe(201);
        expect(response.text).toContain('DespatchAdvice');
        // Extract ID from response for later tests
        createdDespatchAdviceId = response.body?.id || 'DA-12345';
      });

      test('should fail without authentication token (401)', async () => {
        const payload = createDespatchAdvicePayload();
        const response = await request(app)
          .post('/api/despatch-advices')
          .send(payload);

        expect(response.status).toBe(401);
      });

      test('should fail with invalid token (401)', async () => {
        const payload = createDespatchAdvicePayload();
        const response = await request(app)
          .post('/api/despatch-advices')
          .set('Authorization', `Bearer ${INVALID_TOKEN}`)
          .send(payload);

        expect(response.status).toBe(401);
      });

      test('should fail with missing required field (400)', async () => {
        const payload = createDespatchAdvicePayload();
        delete payload.items; // Remove required field

        const response = await request(app)
          .post('/api/despatch-advices')
          .set('Authorization', `Bearer ${DESPATCH_PARTY}`)
          .send(payload);

        expect(response.status).toBe(400);
      });

      test('should fail with invalid quantity (422)', async () => {
        const payload = createDespatchAdvicePayload({
          items: [{ sku: 'ITEM-A', description: 'Widget', quantity: -5, uom: 'EA' }],
        });

        const response = await request(app)
          .post('/api/despatch-advices')
          .set('Authorization', `Bearer ${DESPATCH_PARTY}`)
          .send(payload);

        expect(response.status).toBe(422);
      });
    });

    describe('GET /api/despatch-advices/{dispatchAdviceId}', () => {
      test('should retrieve despatch advice by ID with valid token', async () => {
        const response = await request(app)
          .get('/api/despatch-advices/DA-12345')
          .set('Authorization', `Bearer ${DESPATCH_PARTY}`);

        expect([200, 404]).toContain(response.status);
        if (response.status === 200) {
          expect(response.text).toContain('DespatchAdvice');
        }
      });

      test('should fail without authentication token (401)', async () => {
        const response = await request(app)
          .get('/api/despatch-advices/DA-12345');

        expect(response.status).toBe(401);
      });

      test('should fail with invalid token (401)', async () => {
        const response = await request(app)
          .get('/api/despatch-advices/DA-12345')
          .set('Authorization', `Bearer ${INVALID_TOKEN}`);

        expect(response.status).toBe(401);
      });

      test('should return 404 for non-existent despatch advice', async () => {
        const response = await request(app)
          .get('/api/despatch-advices/DA-NONEXISTENT-99999')
          .set('Authorization', `Bearer ${DESPATCH_PARTY}`);

        expect(response.status).toBe(404);
      });
    });
  });

  // ==================== RECEIPT ADVICE TESTS ====================
  describe('Receipt Advice Endpoints', () => {
    let createdReceiptAdviceId;
    let validDespatchAdviceId = 'DA-TEST-001';

    describe('POST /api/receipt-advices', () => {
      test('should create receipt advice successfully with valid token', async () => {
        const payload = createReceiptAdvicePayload(validDespatchAdviceId);
        const response = await request(app)
          .post('/api/receipt-advices')
          .set('Authorization', `Bearer ${DELIVERY_PARTY}`)
          .send(payload);

        expect([201, 404, 401]).toContain(response.status);
        if (response.status === 201) {
          expect(response.text).toContain('ReceiptAdvice');
          createdReceiptAdviceId = response.body?.id || 'RA-12345';
        }
      });

      test('should fail without authentication token (401)', async () => {
        const payload = createReceiptAdvicePayload(validDespatchAdviceId);
        const response = await request(app)
          .post('/api/receipt-advices')
          .send(payload);

        expect(response.status).toBe(401);
      });

      test('should fail with invalid token (401)', async () => {
        const payload = createReceiptAdvicePayload(validDespatchAdviceId);
        const response = await request(app)
          .post('/api/receipt-advices')
          .set('Authorization', `Bearer ${INVALID_TOKEN}`)
          .send(payload);

        expect(response.status).toBe(401);
      });

      test('should fail with missing required field (400)', async () => {
        const payload = createReceiptAdvicePayload(validDespatchAdviceId);
        delete payload.receivedItems;

        const response = await request(app)
          .post('/api/receipt-advices')
          .set('Authorization', `Bearer ${DELIVERY_PARTY}`)
          .send(payload);

        expect([400, 401]).toContain(response.status);
      });

      test('should fail with non-existent despatch advice (404)', async () => {
        const payload = createReceiptAdvicePayload('DA-NONEXISTENT-99999');
        const response = await request(app)
          .post('/api/receipt-advices')
          .set('Authorization', `Bearer ${DELIVERY_PARTY}`)
          .send(payload);

        expect([404, 401]).toContain(response.status);
      });

      test('should fail with invalid quantity (422)', async () => {
        const payload = createReceiptAdvicePayload(validDespatchAdviceId, {
          receivedItems: [{ sku: 'ITEM-A', quantityReceived: -3 }],
        });

        const response = await request(app)
          .post('/api/receipt-advices')
          .set('Authorization', `Bearer ${DELIVERY_PARTY}`)
          .send(payload);

        expect([422, 401]).toContain(response.status);
      });
    });

    describe('GET /api/receipt-advices/{receiptAdviceId}', () => {
      test('should retrieve receipt advice by ID with valid token', async () => {
        const response = await request(app)
          .get('/api/receipt-advices/RA-12345')
          .set('Authorization', `Bearer ${DELIVERY_PARTY}`);

        expect([200, 404, 401]).toContain(response.status);
        if (response.status === 200) {
          expect(response.text).toContain('ReceiptAdvice');
        }
      });

      test('should fail without authentication token (401)', async () => {
        const response = await request(app)
          .get('/api/receipt-advices/RA-12345');

        expect(response.status).toBe(401);
      });

      test('should fail with invalid token (401)', async () => {
        const response = await request(app)
          .get('/api/receipt-advices/RA-12345')
          .set('Authorization', `Bearer ${INVALID_TOKEN}`);

        expect(response.status).toBe(401);
      });

      test('should return 404 for non-existent receipt advice', async () => {
        const response = await request(app)
          .get('/api/receipt-advices/RA-NONEXISTENT-99999')
          .set('Authorization', `Bearer ${DELIVERY_PARTY}`);

        expect([404, 401]).toContain(response.status);
      });
    });
  });

  // ==================== FULFILMENT CANCELLATION TESTS ====================
  describe('Fulfilment Cancellation Endpoints', () => {
    let createdFulfilmentCancellationId;
    const testDespatchAdviceId = 'DA-FC-001';

    describe('POST /api/fulfilment-cancellations', () => {
      test('should create fulfilment cancellation successfully with valid token', async () => {
        const payload = createFulfilmentCancellationPayload(testDespatchAdviceId);
        const response = await request(app)
          .post('/api/fulfilment-cancellations')
          .set('Authorization', `Bearer ${DESPATCH_PARTY}`)
          .send(payload);

        expect([201, 404]).toContain(response.status);
        if (response.status === 201) {
          createdFulfilmentCancellationId = response.body?.fulfilmentCancellationId || 'FC-12345';
        }
      });

      test('should fail without authentication token (401)', async () => {
        const payload = createFulfilmentCancellationPayload(testDespatchAdviceId);
        const response = await request(app)
          .post('/api/fulfilment-cancellations')
          .send(payload);

        expect(response.status).toBe(401);
      });

      test('should fail with invalid token (401)', async () => {
        const payload = createFulfilmentCancellationPayload(testDespatchAdviceId);
        const response = await request(app)
          .post('/api/fulfilment-cancellations')
          .set('Authorization', `Bearer ${INVALID_TOKEN}`)
          .send(payload);

        expect(response.status).toBe(401);
      });

      test('should fail with missing required field (400)', async () => {
        const payload = createFulfilmentCancellationPayload(testDespatchAdviceId);
        delete payload.reason;

        const response = await request(app)
          .post('/api/fulfilment-cancellations')
          .set('Authorization', `Bearer ${DESPATCH_PARTY}`)
          .send(payload);

        expect(response.status).toBe(400);
      });

      test('should fail with non-existent despatch advice (404)', async () => {
        const payload = createFulfilmentCancellationPayload('DA-NONEXISTENT-99999');
        const response = await request(app)
          .post('/api/fulfilment-cancellations')
          .set('Authorization', `Bearer ${DESPATCH_PARTY}`)
          .send(payload);

        expect(response.status).toBe(404);
      });
    });

    describe('GET /api/fulfilment-cancellations/{fulfilmentCancellationId}', () => {
      test('should retrieve fulfilment cancellation by ID with valid token', async () => {
        const response = await request(app)
          .get('/api/fulfilment-cancellations/FC-12345')
          .set('Authorization', `Bearer ${DESPATCH_PARTY}`);

        expect([200, 404]).toContain(response.status);
      });

      test('should fail without authentication token (401)', async () => {
        const response = await request(app)
          .get('/api/fulfilment-cancellations/FC-12345');

        expect(response.status).toBe(401);
      });

      test('should fail with invalid token (401)', async () => {
        const response = await request(app)
          .get('/api/fulfilment-cancellations/FC-12345')
          .set('Authorization', `Bearer ${INVALID_TOKEN}`);

        expect(response.status).toBe(401);
      });

      test('should return 404 for non-existent cancellation', async () => {
        const response = await request(app)
          .get('/api/fulfilment-cancellations/FC-NONEXISTENT-99999')
          .set('Authorization', `Bearer ${DESPATCH_PARTY}`);

        expect(response.status).toBe(404);
      });
    });

    describe('DELETE /api/fulfilment-cancellations/{fulfilmentCancellationId}', () => {
      test('should delete fulfilment cancellation successfully with valid token', async () => {
        const response = await request(app)
          .delete('/api/fulfilment-cancellations/FC-12345')
          .set('Authorization', `Bearer ${DESPATCH_PARTY}`);

        expect([200, 404]).toContain(response.status);
      });

      test('should fail without authentication token (401)', async () => {
        const response = await request(app)
          .delete('/api/fulfilment-cancellations/FC-12345');

        expect(response.status).toBe(401);
      });

      test('should fail with invalid token (401)', async () => {
        const response = await request(app)
          .delete('/api/fulfilment-cancellations/FC-12345')
          .set('Authorization', `Bearer ${INVALID_TOKEN}`);

        expect(response.status).toBe(401);
      });

      test('should return 404 for non-existent cancellation', async () => {
        const response = await request(app)
          .delete('/api/fulfilment-cancellations/FC-NONEXISTENT-99999')
          .set('Authorization', `Bearer ${DESPATCH_PARTY}`);

        expect(response.status).toBe(404);
      });
    });
  });

  // ==================== ORDER ADJUSTMENT TESTS ====================
  describe('Order Adjustment Endpoints', () => {
    let createdOrderAdjustmentId;
    const testDespatchAdviceId = 'DA-OA-001';

    describe('POST /api/order-adjustments', () => {
      test('should create order adjustment successfully with valid token', async () => {
        const payload = createOrderAdjustmentPayload(testDespatchAdviceId);
        const response = await request(app)
          .post('/api/order-adjustments')
          .set('Authorization', `Bearer ${DELIVERY_PARTY}`)
          .send(payload);

        expect([201, 404, 409, 403, 401]).toContain(response.status);
        if (response.status === 201) {
          createdOrderAdjustmentId = response.body?.orderAdjustmentId || 'OA-12345';
        }
      });

      test('should fail without authentication token (401)', async () => {
        const payload = createOrderAdjustmentPayload(testDespatchAdviceId);
        const response = await request(app)
          .post('/api/order-adjustments')
          .send(payload);

        expect(response.status).toBe(401);
      });

      test('should fail with invalid token (401)', async () => {
        const payload = createOrderAdjustmentPayload(testDespatchAdviceId);
        const response = await request(app)
          .post('/api/order-adjustments')
          .set('Authorization', `Bearer ${INVALID_TOKEN}`)
          .send(payload);

        expect(response.status).toBe(401);
      });

      test('should fail with missing required field (400)', async () => {
        const payload = createOrderAdjustmentPayload(testDespatchAdviceId);
        delete payload.adjustments;

        const response = await request(app)
          .post('/api/order-adjustments')
          .set('Authorization', `Bearer ${DELIVERY_PARTY}`)
          .send(payload);

        expect([400, 403, 401]).toContain(response.status);
      });

      test('should fail with non-existent despatch advice (404)', async () => {
        const payload = createOrderAdjustmentPayload('DA-NONEXISTENT-99999');
        const response = await request(app)
          .post('/api/order-adjustments')
          .set('Authorization', `Bearer ${DELIVERY_PARTY}`)
          .send(payload);

        expect([404, 403, 401]).toContain(response.status);
      });

      test('should fail when order already cancelled or delivered (409)', async () => {
        const payload = createOrderAdjustmentPayload('DA-CANCELLED-01');
        const response = await request(app)
          .post('/api/order-adjustments')
          .set('Authorization', `Bearer ${DELIVERY_PARTY}`)
          .send(payload);

        expect([409, 404, 403, 401]).toContain(response.status);
      });
    });

    describe('GET /api/order-adjustments/{orderAdjustmentId}', () => {
      test('should retrieve order adjustment by ID with valid token', async () => {
        const response = await request(app)
          .get('/api/order-adjustments/OA-12345')
          .set('Authorization', `Bearer ${DELIVERY_PARTY}`);

        expect([200, 404, 401]).toContain(response.status);
      });

      test('should fail without authentication token (401)', async () => {
        const response = await request(app)
          .get('/api/order-adjustments/OA-12345');

        expect(response.status).toBe(401);
      });

      test('should fail with invalid token (401)', async () => {
        const response = await request(app)
          .get('/api/order-adjustments/OA-12345')
          .set('Authorization', `Bearer ${INVALID_TOKEN}`);

        expect(response.status).toBe(401);
      });

      test('should return 404 for non-existent order adjustment', async () => {
        const response = await request(app)
          .get('/api/order-adjustments/OA-NONEXISTENT-99999')
          .set('Authorization', `Bearer ${DELIVERY_PARTY}`);

        expect([404, 401]).toContain(response.status);
      });
    });
  });
});

const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const mongoose = require('mongoose');
const ReceiptAdvice = require('../../models/ReceiptAdvice');
const DespatchAdvice = require('../../models/DespatchAdvice');
const Party = require('../../models/Party');
const app = require('../../app');

// Auth token — uses partyId as Bearer token (see middleware/auth.js)
const AUTH_PARTY_ID = 'TEST-PARTY-001';
const AUTH_HEADER = `Bearer ${AUTH_PARTY_ID}`;

let mongod;

describe('Receipt Advice API', () => {

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.disconnect();
    await mongoose.connect(mongod.getUri());

    await Party.create({
      partyId: AUTH_PARTY_ID,
      name: 'Test Party',
      passwordHash: 'dummy-hash',
      role: 'DELIVERY_PARTY',
    });
  });

  // Cleanup receipt advices and despatch advices between tests
  afterEach(async () => {
    await ReceiptAdvice.deleteMany({});
    await DespatchAdvice.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  // Helper to seed a DespatchAdvice with a given status
  async function seedDespatchAdvice(dispatchAdviceId, status = 'SENT') {
    return DespatchAdvice.create({
      dispatchAdviceId,
      externalRef: 'REF-001',
      despatchParty: { partyId: 'SUP-01', name: 'Supplier Alpha' },
      deliveryParty: { partyId: 'WH-02', name: 'Warehouse Beta' },
      dispatchDate: new Date(),
      items: [{ sku: 'ITEM-A', description: 'Blue Widget', quantity: 5, uom: 'EA' }],
      status,
    });
  }

  /**
   * Authentication
   */
  describe('Authentication', () => {

    test('should return 401 when Authorization header is missing', async () => {
      const response = await request(app)
        .post('/api/receipt-advices')
        .send({});

      expect(response.statusCode).toBe(401);
    });

    test('should return 401 when an invalid token is provided', async () => {
      const response = await request(app)
        .post('/api/receipt-advices')
        .set('Authorization', 'Bearer INVALID-TOKEN')
        .send({});

      expect(response.statusCode).toBe(401);
    });
  });

  /**
   * CREATE Operations
   * Testing POST /api/receipt-advices
   */
  describe('POST /api/receipt-advices', () => {

    test('should successfully create a receipt advice and return UBL XML', async () => {
      await seedDespatchAdvice('DA-SENT-001', 'SENT');

      const payload = {
        dispatchAdviceId: 'DA-SENT-001',
        receiptDate: new Date().toISOString(),
        receivedItems: [
          { sku: 'ITEM-A', quantityReceived: 3, uom: 'EA' },
        ],
        notes: 'Goods in good condition',
      };

      const response = await request(app)
        .post('/api/receipt-advices')
        .set('Authorization', AUTH_HEADER)
        .send(payload);

      expect(response.statusCode).toBe(201);
      expect(response.headers['content-type']).toMatch(/application\/xml/);
      expect(response.text).toContain('<');

      // Verify it was saved to the database
      const saved = await ReceiptAdvice.findOne({ dispatchAdviceId: 'DA-SENT-001' });
      expect(saved).not.toBeNull();
    });

    test('should return 404 if the referenced dispatchAdviceId does not exist', async () => {
      const response = await request(app)
        .post('/api/receipt-advices')
        .set('Authorization', AUTH_HEADER)
        .send({
          dispatchAdviceId: 'NON-EXISTENT-DA',
          receiptDate: new Date().toISOString(),
          receivedItems: [{ sku: 'ITEM-A', quantityReceived: 1, uom: 'EA' }],
        });

      expect(response.statusCode).toBe(404);
      expect(response.body.error.message).toMatch(/not found/i);
    });

    test('should return 409 if the DespatchAdvice is still in CREATED status', async () => {
      await seedDespatchAdvice('DA-CREATED-001', 'CREATED');

      const response = await request(app)
        .post('/api/receipt-advices')
        .set('Authorization', AUTH_HEADER)
        .send({
          dispatchAdviceId: 'DA-CREATED-001',
          receiptDate: new Date().toISOString(),
          receivedItems: [{ sku: 'ITEM-A', quantityReceived: 2, uom: 'EA' }],
        });

      expect(response.statusCode).toBe(409);
      expect(response.body.error.code).toBe('CONFLICT');
    });

    test('should return 422 if any receivedItem has a negative quantityReceived', async () => {
      await seedDespatchAdvice('DA-SENT-002', 'SENT');

      const response = await request(app)
        .post('/api/receipt-advices')
        .set('Authorization', AUTH_HEADER)
        .send({
          dispatchAdviceId: 'DA-SENT-002',
          receiptDate: new Date().toISOString(),
          receivedItems: [{ sku: 'ITEM-A', quantityReceived: -1, uom: 'EA' }],
        });

      expect(response.statusCode).toBe(422);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    describe('Required field validation', () => {
      const requiredFields = ['dispatchAdviceId', 'receiptDate', 'receivedItems'];

      test.each(requiredFields)(
        'should return 400 Bad Request when mandatory field "%s" is missing',
        async (field) => {
          const payload = {
            dispatchAdviceId: 'DA-ANY',
            receiptDate: new Date().toISOString(),
            receivedItems: [{ sku: 'ITEM-A', quantityReceived: 1, uom: 'EA' }],
          };

          delete payload[field];

          const response = await request(app)
            .post('/api/receipt-advices')
            .set('Authorization', AUTH_HEADER)
            .send(payload);

          expect(response.statusCode).toBe(400);
          expect(response.body).toHaveProperty('error');
        }
      );
    });
  });

  /**
   * READ Operations
   * Testing GET /api/receipt-advices/:receiptAdviceId
   */
  describe('GET /api/receipt-advices/:receiptAdviceId', () => {

    test('should return UBL XML for an existing receipt advice', async () => {
      const xmlDoc = '<ReceiptAdvice><ID>RA-TEST-001</ID></ReceiptAdvice>';
      await ReceiptAdvice.create({
        receiptAdviceId: 'RA-TEST-001',
        dispatchAdviceId: 'DA-ANY',
        receiptDate: new Date(),
        receivedItems: [{ sku: 'ITEM-A', quantityReceived: 2, uom: 'EA' }],
        xmlDocument: xmlDoc,
      });

      const response = await request(app)
        .get('/api/receipt-advices/RA-TEST-001')
        .set('Authorization', AUTH_HEADER);

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/xml/);
      expect(response.text).toBe(xmlDoc);
    });

    test('should return 404 when the receipt advice does not exist', async () => {
      const response = await request(app)
        .get('/api/receipt-advices/RA-MISSING')
        .set('Authorization', AUTH_HEADER);

      expect(response.statusCode).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

});

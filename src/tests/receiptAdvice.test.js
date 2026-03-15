require('dotenv').config();
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const ReceiptAdvice = require('../models/ReceiptAdvice');
const DespatchAdvice = require('../models/DespatchAdvice');
const OrderAdjustment = require('../models/OrderAdjustment');
const app = require('../app');

describe('Receipt Advice API', () => {
  let mongod;

  const despatchAdviceBase = {
    dispatchAdviceId: 'DA-TEST-001',
    externalRef: 'REF-001',
    despatchParty: { partyId: 'SUP-01', name: 'Supplier Alpha' },
    deliveryParty: { partyId: 'WH-01', name: 'Warehouse Beta' },
    dispatchDate: new Date(),
    items: [
      { sku: 'ITEM-A', description: 'Blue Widget', quantity: 5, uom: 'EA' },
      { sku: 'ITEM-B', description: 'Red Widget', quantity: 3, uom: 'EA' },
    ],
    status: 'SENT',
  };

  const validReceiptBody = {
    dispatchAdviceId: 'DA-TEST-001',
    receiptDate: new Date().toISOString(),
    receivedItems: [
      { sku: 'ITEM-A', quantityReceived: 5, uom: 'EA' },
      { sku: 'ITEM-B', quantityReceived: 3, uom: 'EA' },
    ],
  };

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.disconnect();
    await mongoose.connect(mongod.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await Promise.all(mongoose.connections.map((con) => con.close()));
    if (mongod) await mongod.stop();
  });

  beforeEach(async () => {
    await ReceiptAdvice.deleteMany({});
    await DespatchAdvice.deleteMany({});
    await OrderAdjustment.deleteMany({});
    await DespatchAdvice.create(despatchAdviceBase);
  });

  /**
   * CREATE
   */
  describe('POST /receipt-advices', () => {

    test('should create a receipt advice and return XML when quantities match', async () => {
      const response = await request(app)
        .post('/receipt-advices')
        .send(validReceiptBody);

      expect(response.statusCode).toBe(201);
      expect(response.headers['content-type']).toMatch(/xml/);

      const record = await ReceiptAdvice.findOne({ dispatchAdviceId: 'DA-TEST-001' });
      expect(record).not.toBeNull();
    });

    test('should update DespatchAdvice status to DELIVERED after receipt', async () => {
      await request(app).post('/receipt-advices').send(validReceiptBody);

      const da = await DespatchAdvice.findOne({ dispatchAdviceId: 'DA-TEST-001' });
      expect(da.status).toBe('DELIVERED');
    });

    test('should auto-create an OrderAdjustment when quantities do not match', async () => {
      const body = {
        ...validReceiptBody,
        receivedItems: [
          { sku: 'ITEM-A', quantityReceived: 3, uom: 'EA' }, // dispatched 5, received 3
          { sku: 'ITEM-B', quantityReceived: 3, uom: 'EA' },
        ],
      };

      const response = await request(app).post('/receipt-advices').send(body);
      expect(response.statusCode).toBe(201);

      const adjustment = await OrderAdjustment.findOne({ dispatchAdviceId: 'DA-TEST-001' });
      expect(adjustment).not.toBeNull();
      expect(adjustment.adjustments).toHaveLength(1);
      expect(adjustment.adjustments[0].sku).toBe('ITEM-A');
      expect(adjustment.adjustments[0].from).toBe(5);
      expect(adjustment.adjustments[0].to).toBe(3);
    });

    test('should not create an OrderAdjustment when all quantities match', async () => {
      await request(app).post('/receipt-advices').send(validReceiptBody);

      const adjustment = await OrderAdjustment.findOne({ dispatchAdviceId: 'DA-TEST-001' });
      expect(adjustment).toBeNull();
    });

    test('should return 404 if dispatchAdviceId does not exist', async () => {
      const response = await request(app)
        .post('/receipt-advices')
        .send({ ...validReceiptBody, dispatchAdviceId: 'DA-NONEXISTENT' });

      expect(response.statusCode).toBe(404);
    });

    test('should return 422 if any quantityReceived is negative', async () => {
      const body = {
        ...validReceiptBody,
        receivedItems: [{ sku: 'ITEM-A', quantityReceived: -1, uom: 'EA' }],
      };

      const response = await request(app).post('/receipt-advices').send(body);
      expect(response.statusCode).toBe(422);
    });

    test('should return 409 if DespatchAdvice has not been sent yet (CREATED)', async () => {
      await DespatchAdvice.updateOne(
        { dispatchAdviceId: 'DA-TEST-001' },
        { status: 'CREATED' }
      );

      const response = await request(app).post('/receipt-advices').send(validReceiptBody);
      expect(response.statusCode).toBe(409);
    });

    test('should return 409 if DespatchAdvice is already DELIVERED', async () => {
      await DespatchAdvice.updateOne(
        { dispatchAdviceId: 'DA-TEST-001' },
        { status: 'DELIVERED' }
      );

      const response = await request(app).post('/receipt-advices').send(validReceiptBody);
      expect(response.statusCode).toBe(409);
    });

    test('should return 409 if DespatchAdvice is CANCELLED', async () => {
      await DespatchAdvice.updateOne(
        { dispatchAdviceId: 'DA-TEST-001' },
        { status: 'CANCELLED' }
      );

      const response = await request(app).post('/receipt-advices').send(validReceiptBody);
      expect(response.statusCode).toBe(409);
    });

    test.each(['dispatchAdviceId', 'receiptDate', 'receivedItems'])(
      'should return 400 if required field "%s" is missing',
      async (field) => {
        const body = { ...validReceiptBody };
        delete body[field];

        const response = await request(app).post('/receipt-advices').send(body);
        expect(response.statusCode).toBe(400);
      }
    );

  });

  /**
   * READ
   */
  describe('GET /receipt-advices/:receiptAdviceId', () => {
    let createdId;

    beforeEach(async () => {
      await request(app).post('/receipt-advices').send(validReceiptBody);
      const record = await ReceiptAdvice.findOne({ dispatchAdviceId: 'DA-TEST-001' });
      createdId = record.receiptAdviceId;
    });

    test('should retrieve receipt advice XML by ID', async () => {
      const response = await request(app).get(`/receipt-advices/${createdId}`);

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/xml/);
    });

    test('should return 404 if receipt advice does not exist', async () => {
      const response = await request(app).get('/receipt-advices/RA-NOT-EXIST');
      expect(response.statusCode).toBe(404);
    });

  });

});
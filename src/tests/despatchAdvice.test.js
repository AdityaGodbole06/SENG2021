require('dotenv').config();
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const DespatchAdvice = require('../models/DespatchAdvice');
const app = require('../app');

describe('Despatch Advice API', () => {
  let mongod;

  const validData = {
    externalRef: "REF-001",
    despatchParty: {
      partyId: "SUP-01",
      name: "Supplier Alpha"
    },
    deliveryParty: {
      partyId: "WH-01",
      name: "Warehouse Beta"
    },
    dispatchDate: new Date(),
    expectedDeliveryDate: new Date(),
    items: [
      {
        sku: "ITEM-A",
        description: "Blue Widget",
        quantity: 5,
        uom: "EA"
      }
    ]
  };

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.disconnect();
    await mongoose.connect(mongod.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await Promise.all(mongoose.connections.map(con => con.close()));
    if (mongod) await mongod.stop();
  });

  beforeEach(async () => {
    await DespatchAdvice.deleteMany({});
  });

  /**
   * CREATE
   */
  describe('POST /despatch-advices', () => {

    test('should successfully create a despatch advice and return XML', async () => {
      const response = await request(app)
        .post('/despatch-advices')
        .send(validData);

      expect(response.statusCode).toBe(201);
      expect(response.headers['content-type']).toMatch(/xml/);

      const record = await DespatchAdvice.findOne({});
      expect(record).not.toBeNull();
      expect(record.status).toBe('SENT');
    });

    test.each([
      'despatchParty',
      'deliveryParty',
      'dispatchDate',
      'items'
    ])(
      'should return 400 if "%s" is missing',
      async (field) => {
        const data = { ...validData };
        delete data[field];

        const response = await request(app)
          .post('/despatch-advices')
          .send(data);

        expect(response.statusCode).toBe(400);
      }
    );

    test('should return 422 if item quantity is less than 1', async () => {
      const data = {
        ...validData,
        items: [
          {
            sku: "ITEM-A",
            description: "Bad Widget",
            quantity: 0,
            uom: "EA"
          }
        ]
      };

      const response = await request(app)
        .post('/despatch-advices')
        .send(data);

      expect(response.statusCode).toBe(422);
    });

  });

  /**
   * READ
   */
  describe('GET /despatch-advices/:dispatchAdviceId', () => {
    let generatedId;

    beforeEach(async () => {
      const response = await request(app)
        .post('/despatch-advices')
        .send(validData);

      const record = await DespatchAdvice.findOne({});
      generatedId = record.dispatchAdviceId;
    });

    test('should retrieve despatch advice XML by ID', async () => {
      const response = await request(app)
        .get(`/despatch-advices/${generatedId}`);

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/xml/);
    });

    test('should return 404 if despatch advice does not exist', async () => {
      const response = await request(app)
        .get('/despatch-advices/DA-NOT-EXIST');

      expect(response.statusCode).toBe(404);
    });

  });
});

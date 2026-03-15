require('dotenv').config();
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const FulfilmentCancellation = require('../models/FulfilmentCancellation');
const DespatchAdvice = require('../models/DespatchAdvice');
const Supply = require('../models/Supply');
const app = require('../app'); 

  /**
   * CREATE Operations
   * Testing POST /fulfilment-cancellations
   */
  describe('Fulfilment Cancellation API', () => {
    let mongod;
    const commonSku = "ITEM-A";
    const commonSupplier = "SUP-01";
    const commonDaId = "DA-12345";

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

    // SEEDING: This runs before EVERY single test in the file
    beforeEach(async () => {
      await Promise.all([
        FulfilmentCancellation.deleteMany({}),
        DespatchAdvice.deleteMany({}),
        Supply.deleteMany({})
      ]);

      await Supply.create({
        sku: commonSku, despatchPartyId: commonSupplier, uom: "EA",
        totalQuantity: 100, allocatedQuantity: 5, availableQuantity: 95, status: 'AVAILABLE'
      });

      await DespatchAdvice.create({
        dispatchAdviceId: commonDaId, externalRef: "REF-001",
        despatchParty: { partyId: commonSupplier, name: "Supplier Alpha" },
        deliveryParty: { partyId: "WH-02", name: "Warehouse Beta" },
        dispatchDate: new Date(),
        items: [{ sku: commonSku, description: "Blue Widget", quantity: 5, uom: "EA" }],
        status: 'SENT'
      });
    });

    describe('POST /fulfilment-cancellations', () => {
      test('should successfully create a cancellation and update inventory/status', async () => {
        const response = await request(app)
          .post('/fulfilment-cancellations')
          .send({ dispatchAdviceId: commonDaId, requestedByPartyId: "USER_1", reason: "Customer requested" });

        expect(response.statusCode).toBe(201);
        expect((await Supply.findOne({ sku: commonSku })).availableQuantity).toBe(100);
        expect((await DespatchAdvice.findOne({ dispatchAdviceId: commonDaId })).status).toBe('CANCELLED');
      });

      test('should return 404 error if the referenced dispatchAdviceId does not exist', async () => {
        const response = await request(app)
          .post('/fulfilment-cancellations')
          .send({ dispatchAdviceId: "NON-EXISTENT", requestedByPartyId: "U1", reason: "Test" });
        expect(response.statusCode).toBe(404);
      });

      // Validations (using your test.each)
      test.each(['dispatchAdviceId', 'requestedByPartyId', 'reason'])(
        'should return 400 Bad Request if mandatory field "%s" is missing',
        async (field) => {
          const data = { dispatchAdviceId: commonDaId, requestedByPartyId: "U1", reason: "Test" };
          delete data[field];
          const response = await request(app).post('/fulfilment-cancellations').send(data);
          expect(response.statusCode).toBe(400);
        }
      );
    });

    describe('READ & DELETE Operations', () => {
      let generatedId;

      // Nested beforeEach: Automatically creates a cancellation for every GET and DELETE test
      beforeEach(async () => {
        const res = await request(app)
          .post('/fulfilment-cancellations')
          .send({ dispatchAdviceId: commonDaId, requestedByPartyId: "ADMIN", reason: "Setup for Read/Delete" });
        generatedId = res.body.fulfilmentCancellationId;
      });

      test('should retrieve a specific cancellation record by its ID', async () => {
        const response = await request(app).get(`/fulfilment-cancellations/${generatedId}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.fulfilmentCancellationId).toBe(generatedId);
      });

      test('should return 404 when attempting to read a non-existent ID', async () => {
        const response = await request(app).get('/fulfilment-cancellations/MISSING-ID');
        expect(response.statusCode).toBe(404);
      });

      test('should successfully delete an existing cancellation record', async () => {
        const response = await request(app).delete(`/fulfilment-cancellations/${generatedId}`);
        expect(response.statusCode).toBe(200);
        expect(await FulfilmentCancellation.findOne({ fulfilmentCancellationId: generatedId })).toBeNull();
      });

      test('should return 404 when trying to delete a non-existent ID', async () => {
        const response = await request(app).delete('/fulfilment-cancellations/GHOST-ID');
        expect(response.statusCode).toBe(404);
      });
    });
  });
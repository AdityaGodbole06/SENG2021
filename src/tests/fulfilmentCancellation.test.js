require('dotenv').config();
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const FulfilmentCancellation = require('../models/FulfilmentCancellation');
const DespatchAdvice = require('../models/DespatchAdvice');
const Supply = require('../models/Supply');
const app = require('../app'); 

describe('Fulfilment Cancellation API', () => {
  let mongod;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    
    await mongoose.disconnect();
    await mongoose.connect(uri);
  });

  afterEach(async () => {
    await FulfilmentCancellation.deleteMany({});
    await DespatchAdvice.deleteMany({});
    await Supply.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    
    await Promise.all(mongoose.connections.map(con => con.close()));
    
    if (mongod) {
      await mongod.stop();
    }
});

  /**
   * CREATE Operations
   * Testing POST /fulfilment-cancellations
   */
  describe('POST /fulfilment-cancellations', () => {
    
    test('should successfully create a cancellation when linked to a valid DespatchAdvice', async () => {
      const parentId = "DA-12345"; 
      const sku = "ITEM-A";
      const supplierId = "SUP-01";

      await Supply.create({
        sku: sku,
        despatchPartyId: supplierId,
        uom: "EA",
        totalQuantity: 100,
        allocatedQuantity: 5,
        availableQuantity: 95,
        status: 'AVAILABLE'
      });
      // Seed the required parent record
      await DespatchAdvice.create({
        dispatchAdviceId: parentId,
        externalRef: "REF-001",
        despatchParty: { partyId: "SUP-01", name: "Supplier Alpha" },
        deliveryParty: { partyId: "WH-02", name: "Warehouse Beta" },
        dispatchDate: new Date(),
        items: [{ sku: "ITEM-A", description: "Blue Widget", quantity: 5, uom: "EA" }],
        status: 'CREATED'
      });

      const cancellationData = {
        fulfilmentCancellationId: "CANC-999",
        dispatchAdviceId: parentId, 
        requestedByPartyId: "USER_1",
        reason: "Customer requested cancellation"
      };

      const response = await request(app)
        .post('/fulfilment-cancellations')
        .send(cancellationData);

      expect(response.statusCode).toBe(201);
      expect(response.body.fulfilmentCancellationId).toBe("CANC-999");

      // 4. ASSERTIONS: Check the Supply Adjustment (The "Adjust Supply Status" box)
      const updatedSupply = await Supply.findOne({ sku, despatchPartyId: supplierId });
      expect(updatedSupply.allocatedQuantity).toBe(0);
      expect(updatedSupply.availableQuantity).toBe(100); 

      // 5. ASSERTIONS: Check the Order Adjustment (The "Adjust Order" / Decision Action)
      const updatedAdvice = await DespatchAdvice.findOne({ dispatchAdviceId: parentId });
      expect(updatedAdvice.status).toBe('CANCELLED');

    });

    test('should return 404 error if the referenced dispatchAdviceId does not exist', async () => {
      const invalidData = {
        fulfilmentCancellationId: "CANC-404",
        dispatchAdviceId: "NON-EXISTENT-ID",
        requestedByPartyId: "USER_1",
        reason: "Testing orphaned record prevention"
      };

      const response = await request(app)
        .post('/fulfilment-cancellations')
        .send(invalidData);

      expect(response.statusCode).toBe(404);
      expect(response.body.message).toMatch(/not found/i);
    });

    describe('Schema Field Validations', () => {

      beforeEach(async () => {
        await DespatchAdvice.create({
          dispatchAdviceId: "DA-123",
          externalRef: "REF-001",
          despatchParty: { partyId: "SUP-01", name: "Supplier Alpha" },
          deliveryParty: { partyId: "WH-02", name: "Warehouse Beta" },
          dispatchDate: new Date(),
          items: [{ sku: "ITEM-A", description: "Blue Widget", quantity: 5, uom: "EA" }],
          status: 'CREATED'
        });
      });

      const requiredFields = [
        'fulfilmentCancellationId',
        'dispatchAdviceId',
        'requestedByPartyId',
        'reason'
      ];

      test.each(requiredFields)(
        'should return 400 Bad Request if mandatory field "%s" is missing',
        async (field) => {
          const incompleteData = {
            fulfilmentCancellationId: "CANC-123",
            dispatchAdviceId: "DA-123",
            requestedByPartyId: "USER_1",
            reason: "Validation test"
          };

          delete incompleteData[field];

          const response = await request(app)
            .post('/fulfilment-cancellations')
            .send(incompleteData);

          expect(response.statusCode).toBe(400);
          expect(response.body).toHaveProperty('message');
        }
      );
    });
  });

  /**
   * READ Operations
   * Testing GET /fulfilment-cancellations
   */
  describe('GET /fulfilment-cancellations', () => {
    
    test('should retrieve a specific cancellation record by its ID', async () => {
      const targetId = "CANC-READ-777";
      
      // Seed data directly
      await FulfilmentCancellation.create({
        fulfilmentCancellationId: targetId,
        dispatchAdviceId: "DA-EXISTING",
        requestedByPartyId: "USER_TEST",
        reason: "Testing retrieval"
      });

      const response = await request(app).get(`/fulfilment-cancellations/${targetId}`);

      expect(response.statusCode).toBe(200);
      expect(response.body.fulfilmentCancellationId).toBe(targetId);
    });

    test('should return 404 when attempting to read a non-existent ID', async () => {
      const response = await request(app).get('/fulfilment-cancellations/MISSING-ID');
      
      expect(response.statusCode).toBe(404);
      expect(response.body.message).toMatch(/not found/i);
    });
  });

  /**
   * DELETE Operations
   * Testing DELETE /fulfilment-cancellations/:id
   */
  describe('DELETE /fulfilment-cancellations/:id', () => {

    test('should successfully delete an existing cancellation record', async () => {
      const idToDelete = "CANC-DELETE-100";

      await FulfilmentCancellation.create({
        fulfilmentCancellationId: idToDelete,
        dispatchAdviceId: "DA-999",
        requestedByPartyId: "USER_ADMIN",
        reason: "Accidental Duplicate"
      });

      const response = await request(app).delete(`/fulfilment-cancellations/${idToDelete}`);

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toContain('successfully deleted');

      // DOUBLE CHECK: Ensure it's actually gone from the DB
      const found = await FulfilmentCancellation.findOne({ fulfilmentCancellationId: idToDelete });
      expect(found).toBeNull();
    });

    test('should return 404 when trying to delete a non-existent ID', async () => {
      const response = await request(app).delete('/fulfilment-cancellations/GHOST-ID');
      
      expect(response.statusCode).toBe(404);
      expect(response.body.message).toMatch(/not found/i);
    });
  });

});
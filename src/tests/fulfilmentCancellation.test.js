require('dotenv').config();
const request = require('supertest');
const mongoose = require('mongoose');
const FulfilmentCancellation = require('../models/FulfilmentCancellation');
const DespatchAdvice = require('../models/DespatchAdvice');
const app = require('../app'); 

describe('Fulfilment API - Transactional Tests', () => {
  let session;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
  });

  beforeEach(async () => {
    session = await mongoose.startSession();
    session.startTransaction();
  });

  afterEach(async () => {
    await session.abortTransaction();
    await session.endSession();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  test('SUCCESS: should create a cancellation when a valid DespatchAdvice exists', async () => {
    const parentId = "DA-UNIQUE-123"; 

    const mockDespatchAdvice = {
      dispatchAdviceId: parentId,
      externalRef: "REF-001",
      despatchParty: { partyId: "SUP-01", name: "Supplier Alpha" },
      deliveryParty: { partyId: "WH-02", name: "Warehouse Beta" },
      dispatchDate: new Date(),
      items: [
        { sku: "ITEM-A", description: "Blue Widget", quantity: 5, uom: "EA" }
      ],
      status: 'CREATED'
    };

    // Save parent into the transactional session
    await DespatchAdvice.create([mockDespatchAdvice], { session });

    //Create the cancellation
    const cancellationData = {
      fulfilmentCancellationId: "CANC-999",
      dispatchAdviceId: parentId, 
      requestedByPartyId: "USER_1",
      reason: "Order merged with another"
    };

    const response = await request(app)
      .post('/fulfilment-cancellations')
      .send(cancellationData);

    expect(response.statusCode).toBe(201);
    
    const foundInDb = await FulfilmentCancellation.findOne({ 
      fulfilmentCancellationId: "CANC-999" 
    }).session(session);

    expect(foundInDb).not.toBeNull();
    expect(foundInDb.dispatchAdviceId).toBe(parentId);
  });

  describe('Required Field Validations', () => {
    const requiredFields = [
      'fulfilmentCancellationId',
      'dispatchAdviceId',
      'requestedByPartyId',
      'reason'
    ];

    test.each(requiredFields)(
      'FAILURE: should return 400 if %s is missing',
      async (field) => {
        const incompleteData = {
          fulfilmentCancellationId: "CANC-123",
          dispatchAdviceId: "DESP-123",
          requestedByPartyId: "USER_1",
          reason: "Test Reason"
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

  test('FAILURE: should return 404 if the dispatchAdviceId does not exist in the database', async () => {
    const nonExistentData = {
      fulfilmentCancellationId: "CANC-404",
      dispatchAdviceId: "DESP-DOES-NOT-EXIST",
      requestedByPartyId: "USER_1",
      reason: "Testing invalid reference"
    };

    const response = await request(app)
      .post('/fulfilment-cancellations')
      .send(nonExistentData);

    // We expect 404 (Not Found) because the parent record is missing
    expect(response.statusCode).toBe(404);
    expect(response.body.message).toContain('DespatchAdvice not found');
  });
});
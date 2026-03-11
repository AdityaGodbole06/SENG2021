require('dotenv').config();
const request = require('supertest');
const mongoose = require('mongoose');
const FulfilmentCancellation = require('../models/FulfilmentCancellation');
const app = require('../app'); 

describe('Fulfilment API - Transactional Tests', () => {
  let session;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
  });

  // START a transaction before every single test
  beforeEach(async () => {
    session = await mongoose.startSession();
    session.startTransaction();
  });

  // ROLLBACK (Undo) the transaction after every single test
  afterEach(async () => {
    await session.abortTransaction();
    await session.endSession();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('should create a cancellation without leaving data behind', async () => {
    const mockData = {
      fulfilmentCancellationId: "CANC-999",
      dispatchAdviceId: "DESP-123",
      requestedByPartyId: "USER_1",
      reason: "Transactional Test"
    };
  const response = await request(app).post('/api/cancellations').send(mockData);
  expect(response.statusCode).toBe(201);

  const foundInDb = await FulfilmentCancellation.findOne({ 
    fulfilmentCancellationId: "CANC-999" 
  });

  // Assert that the database actually found it
  expect(foundInDb).not.toBeNull(); 
  expect(foundInDb.reason).toBe("Transactional Test");
  });
});
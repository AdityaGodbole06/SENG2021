require('dotenv').config();
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const Party = require('../models/Party');
const { authorizeRoles } = require('../middleware/auth');
const app = require('../app');

describe('Authentication Middleware', () => {
  let mongod;

  const validParty = {
    partyId: 'TOKEN-VALID-001',
    name: 'Test Supplier',
    passwordHash: 'hashedpassword',
    role: 'DESPATCH_PARTY',
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
    await Party.deleteMany({});
    await Party.create(validParty);
  });

  describe('GET /api/test', () => {

    test('should return 200 with party info when token is valid', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('Authorization', `Bearer ${validParty.partyId}`);

      expect(response.statusCode).toBe(200);
      expect(response.body.authenticatedParty.partyId).toBe(validParty.partyId);
      expect(response.body.authenticatedParty.role).toBe(validParty.role);
    });

    test('should return 401 when Authorization header is missing', async () => {
      const response = await request(app).get('/api/test');

      expect(response.statusCode).toBe(401);
      expect(response.body.error).toMatch(/missing authorization header/i);
    });

    test('should return 401 when Authorization header does not start with Bearer', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('Authorization', `Basic ${validParty.partyId}`);

      expect(response.statusCode).toBe(401);
      expect(response.body.error).toMatch(/invalid authorization format/i);
    });

    test('should return 401 when token does not match any party', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('Authorization', 'Bearer INVALID-TOKEN-XYZ');

      expect(response.statusCode).toBe(401);
      expect(response.body.error).toMatch(/invalid token/i);
    });

  });

  describe('Role-based access on authenticated routes', () => {

    test('DESPATCH_PARTY token should access /api/despatch-advices', async () => {
      const response = await request(app)
        .post('/api/despatch-advices')
        .set('Authorization', `Bearer ${validParty.partyId}`)
        .send({
          externalRef: 'REF-AUTH-001',
          despatchParty: { partyId: 'SUP-01', name: 'Supplier Alpha' },
          deliveryParty: { partyId: 'WH-01', name: 'Warehouse Beta' },
          dispatchDate: new Date().toISOString(),
          items: [{ sku: 'ITEM-A', description: 'Widget', quantity: 5, uom: 'EA' }],
        });

      // Auth passed — result depends on business logic, not 401
      expect(response.statusCode).not.toBe(401);
    });

    test('should return 401 on /api/despatch-advices without token', async () => {
      const response = await request(app)
        .post('/api/despatch-advices')
        .send({});

      expect(response.statusCode).toBe(401);
    });

    test('should return 401 on /api/receipt-advices without token', async () => {
      const response = await request(app)
        .post('/api/receipt-advices')
        .send({});

      expect(response.statusCode).toBe(401);
    });

    test('should return 401 on /api/order-adjustments without token', async () => {
      const response = await request(app)
        .get('/api/order-adjustments/some-id')
        .send();

      expect(response.statusCode).toBe(401);
    });

  });

  describe('authorizeRoles unit tests', () => {
    const mockRes = () => {
      const res = {};
      res.status = jest.fn().mockReturnValue(res);
      res.json = jest.fn().mockReturnValue(res);
      return res;
    };

    test('should call next() when party has an allowed role', () => {
      const req = { party: { partyId: 'SUP-01', role: 'DESPATCH_PARTY' } };
      const res = mockRes();
      const next = jest.fn();

      authorizeRoles('DESPATCH_PARTY')(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should return 403 when party role is not in allowed roles', () => {
      const req = { party: { partyId: 'WH-01', role: 'DELIVERY_PARTY' } };
      const res = mockRes();
      const next = jest.fn();

      authorizeRoles('DESPATCH_PARTY')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 when req.party is not set', () => {
      const req = {};
      const res = mockRes();
      const next = jest.fn();

      authorizeRoles('DESPATCH_PARTY')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    test('should allow multiple roles', () => {
      const req = { party: { partyId: 'WH-01', role: 'DELIVERY_PARTY' } };
      const res = mockRes();
      const next = jest.fn();

      authorizeRoles('DESPATCH_PARTY', 'DELIVERY_PARTY')(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

});
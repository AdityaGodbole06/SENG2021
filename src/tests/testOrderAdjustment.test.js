const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const mongoose = require('mongoose');
const OrderAdjustment = require('../models/OrderAdjustment');
const DespatchAdvice = require('../models/DespatchAdvice');
const Party = require('../models/Party');
const app = require('../app');

const AUTH_PARTY_ID = 'test-party-001';
const AUTH_HEADER = `Bearer ${AUTH_PARTY_ID}`;

let mongod;

describe('Test Order Adjustment API', () => {

    beforeAll(async () => {
        mongod = await MongoMemoryServer.create();
        await mongoose.disconnect();
        await mongoose.connect(mongod.getUri());

        // Create party once — reused across all tests
        await Party.create({
            partyId: AUTH_PARTY_ID,
            name: 'Test Party 1',
            passwordHash: '123',
            role: 'DELIVERY_PARTY',
        });
    });

    afterEach(async () => {
        await OrderAdjustment.deleteMany({});
        await DespatchAdvice.deleteMany({});
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongod.stop();
    });

    // Setup helpers
    async function seedDespatch(overrides = {}) {
        return DespatchAdvice.create({
            dispatchAdviceId: 'DA-TEST-001',
            externalRef: 'PO-001',
            despatchParty: { partyId: 'P001', name: 'Despatch Party' },
            deliveryParty: { partyId: 'P002', name: 'Delivery Party' },
            dispatchDate: new Date(),
            items: [{ sku: 'SKU-123', description: 'Widget', quantity: 10, uom: 'EA' }],
            status: 'SENT',
            ...overrides,
        });
    }

    const validBody = {
        despatchAdviceId: 'DA-TEST-001',
        requestedByPartyId: 'P001',
        reason: 'Wrong quantity',
        adjustments: [{ sku: 'SKU-123', field: 'QUANTITY', from: 10, to: 5 }],
    };

    // TEST for POST operations on Order Adjustment
    describe('POST /api/order-adjustments', () => {

        test('Create an adjustment for valid despatch advice', async () => {
            await seedDespatch();

            const res = await request(app)
                .post('/api/order-adjustments')
                .set('Authorization', AUTH_HEADER)
                .send(validBody);

            expect(res.statusCode).toBe(201);
            expect(res.body.dispatchAdviceId).toBe('DA-TEST-001');
            expect(res.body.status).toBe('PENDING');
        });

        test('Despatch advice does not exist, return 400', async () => {
            // intentionally not seeding a despatch advice
            const res = await request(app)
                .post('/api/order-adjustments')
                .set('Authorization', AUTH_HEADER)
                .send(validBody);

            expect(res.statusCode).toBe(404);
            expect(res.body.error).toMatch(/not found/i);
        });

        test('Despatch advice CANCELLED, return 409', async () => {
            await seedDespatch({ status: 'CANCELLED' });

            const res = await request(app)
                .post('/api/order-adjustments')
                .set('Authorization', AUTH_HEADER)
                .send(validBody);

            expect(res.statusCode).toBe(409);
            expect(res.body.error).toMatch(/cancelled/i);
        });

        test('Despatch advice already DELIVERED, return 409', async () => {
            await seedDespatch({ status: 'DELIVERED' });

            const res = await request(app)
                .post('/api/order-adjustments')
                .set('Authorization', AUTH_HEADER)
                .send(validBody);

            expect(res.statusCode).toBe(409);
            expect(res.body.error).toMatch(/delivered/i);
        });

        test('Non existent SKU in despatch, return 400', async () => {
            await seedDespatch();

            const res = await request(app)
                .post('/api/order-adjustments')
                .set('Authorization', AUTH_HEADER)
                .send({ ...validBody, adjustments: [{ sku: 'NONEXIST-SKU', field: 'QUANTITY', from: 10, to: 5 }] });

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toMatch(/NONEXIST-SKU/);
        });

        test('No auth token, return 401', async () => {
            const res = await request(app)
                .post('/api/order-adjustments')
                .send(validBody);

            expect(res.statusCode).toBe(401);
        });

        test('Invalid auth token, return 401', async () => {
            const res = await request(app)
                .post('/api/order-adjustments')
                .set('Authorization', 'Bearer INVALID-TOKEN-999')
                .send(validBody);

            expect(res.statusCode).toBe(401);
        });

        test('Empty adjustments array, return 400', async () => {
            await seedDespatch();

            const res = await request(app)
                .post('/api/order-adjustments')
                .set('Authorization', AUTH_HEADER)
                .send({ ...validBody, adjustments: [] });

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toMatch(/at least one adjustment/i);
        });

        const requiredFields = ['despatchAdviceId', 'requestedByPartyId', 'reason', 'adjustments'];
        test.each(requiredFields)('Missing required field "%s", return 400', async (field) => {
            await seedDespatch();

            const body = { ...validBody };
            delete body[field];

            const res = await request(app)
                .post('/api/order-adjustments')
                .set('Authorization', AUTH_HEADER)
                .send(body);

            expect(res.statusCode).toBe(400);
        });

        test('Adjustment "to" value of 0 is valid (receiving zero items), return 201', async () => {
            await seedDespatch();

            const res = await request(app)
                .post('/api/order-adjustments')
                .set('Authorization', AUTH_HEADER)
                .send({ ...validBody, adjustments: [{ sku: 'SKU-123', field: 'QUANTITY', from: 10, to: 0 }] });

            expect(res.statusCode).toBe(201);
        });
    });

    describe('GET /api/order-adjustments/:id', () => {

        test('Retrieve Order Adjustment by ID', async () => {
            await seedDespatch();

            // Create an adjustment first
            const post = await request(app)
                .post('/api/order-adjustments')
                .set('Authorization', AUTH_HEADER)
                .send(validBody);

            const id = post.body.orderAdjustmentId;

            const res = await request(app)
                .get(`/api/order-adjustments/${id}`)
                .set('Authorization', AUTH_HEADER);

            expect(res.statusCode).toBe(200);
            expect(res.body.orderAdjustmentId).toBe(id);
        });

        test('Non existent ID, return 404', async () => {
            const res = await request(app)
                .get('/api/order-adjustments/ORDER-DOESNT-EXIST')
                .set('Authorization', AUTH_HEADER);

            expect(res.statusCode).toBe(404);
        });
    });
});

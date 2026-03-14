require('dotenv').config();
const request = require('supertest');
const mongoose = require('mongoose');
const OrderAdjustment = require('../models/OrderAdjustment');
const DespatchAdvice = require ('../models/DespatchAdvice');
const Party = require('../models/Party');
const app = require('../app');

describe ('Test Order Adjustment API', () => {

    beforeAll(async () => {
        await mongoose.connect(process.env.MONGODB_URI);
    });

    afterEach(async () => {
        await OrderAdjustment.deleteMany({});
        await DespatchAdvice.deleteMany({});
        await Party.deleteMany({});
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    // Setup helpers
    const seedParty = () => Party.create({
        partyId: 'test-party-001',
        name: 'Test party 1',
        passwordHash: '123',
        role: 'DESPATCH_PARTY'
    });

    const seedDespatch = (overrides = {}) => DespatchAdvice.create({
        dispatchAdviceId: 'DA-TEST-001',
        externalRef: 'PO-001',
        despatchParty: { partyId: 'P001', name: 'Despatch Party' },
        deliveryParty: { partyId: 'P002', name: 'Delivery Party' },
        dispatchDate: new Date(),
        items: [{ sku: 'SKU-123', description: 'Widget', quantity: 10, uom: 'EA' }],
        status: 'SENT',
        ...overrides,
    });

    const validBody = {
        despatchAdviceId: 'DA-TEST-001',
        requestedByPartyId: 'P001',
        reason: 'Wrong quantity',
        adjustments: [{ sku: 'SKU-123', field: 'QUANTITY', from: 10, to: 5}],
    };

    // TEST for POST operations on Order Adjustment
    describe('POST /api/order-adjustments', () => {

        test('Create an adjustment for valid despatch advice', async () => {
            await seedParty();
            await seedDespatch();

            const res = await request(app).post('/api/order-adjustments')
                .set('Authorization', 'Bearer test-party-001').send(validBody);

            expect(res.statusCode).toBe(201);
            expect(res.body.dispatchAdviceId).toBe('DA-TEST-001');
            expect(res.body.status).toBe('PENDING');
        });
        
        test('Despatch advice does not exist, return 400', async () => {
            await seedParty();
            // intentionally not seeding a despatch advice

            const res = await request(app).post('/api/order-adjustments')
                .set('Authorization', 'Bearer test-party-001').send(validBody);

                expect(res.statusCode).toBe(400);
                expect(res.body.error).toMatch(/not found/i);
        });

        test('Despatch advice CANCELLED, return 400', async () => {
            await seedParty();
            await seedDespatch({ status: 'CANCELLED' });

            const res = await request(app).post('/api/order-adjustments')
            .set('Authorization', 'Bearer test-party-001').send(validBody);

            
            expect(res.statusCode).toBe(400);
            expect(res.body.error).toMatch(/cancelled/i);
        });

        test('Despatch advice already DELIVERED, return 400', async () => {
            await seedParty();
            await seedDespatch({ status: 'DELIVERED' });

            const res = await request(app).post('/api/order-adjustments')
            .set('Authorization', 'Bearer test-party-001').send(validBody);

            
            expect(res.statusCode).toBe(400);
            expect(res.body.error).toMatch(/delivered/i);
        }); 


        test('Non existent SKU in despatch, return 400', async () => {
            await seedParty();
            await seedDespatch();

            const res = await request(app).post('/api/order-adjustments')
            .set('Authorization', 'Bearer test-party-001')
            .send({...validBody, adjustments: [{ sku: 'NONEXIST-SKU', field: 'QUANTITY', from: 10, to: 5}] });

            
            expect(res.statusCode).toBe(400);
            expect(res.body.error).toMatch(/NONEXIST-SKU/);
        });

        test('No auth token, return 401', async () => {
            const res = await request(app).post('/api/order-adjustments').send(validBody);

            expect(res.statusCode).toBe(401);
        });
    });

    describe('GET /api/order-adjustments/:id', () => {

        test('Retrieve Order Adjustment ID', async () => {
            await seedParty();
            await seedDespatch();

            // Create order adjustment
            const post = await request(app).post('/api/order-adjustments')
            .set('Authorization', 'Bearer test-party-001').send(validBody);

            const id = post.body.orderAdjustmentId;
            const res = await request(app)
            .get(`/api/order-adjustments/${id}`)
            .set('Authorization', 'Bearer test-party-001');

            expect(res.statusCode).toBe(200);
            expect(res.body.orderAdjustmentId).toBe(id);
        });

        test('Non existent ID, return 404', async () => {
            await seedParty();

            const res = await request(app)
            .get('/api/order-adjustments/ORDER-DOESNT-EXIST')
            .set('Authorization', 'Bearer test-party-001');

            expect(res.statusCode).toBe(404);
        });
    });
});


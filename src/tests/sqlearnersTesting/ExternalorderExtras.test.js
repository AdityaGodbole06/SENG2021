/**
 * Test Orders Extra by group SQLearners
 */
const request = require('supertest');

const BASE_URL = 'https://ordercreationapi.vercel.app';
const TEST_EMAIL = `testuser_${Date.now()}@testing.com`;
const TEST_PASSWORD = 'Testing123!';
const TEST_NAME = 'Test User';

let apiKey;
let userId;

const validOrderBody = {
    orderJson: {
        BuyerCustomerParty: {
            PartyName: 'Test Buyer Party',
            address: {
                street: 'Test Street',
                city: 'Sydney',
                postal_code: '2000',
                country_code: 'AU',
            },
        },
        SellerSupplierParty: {
            PartyName: 'Test Seller Party',
            address: {
                street: 'Test Seller Street',
                city: 'Sydney',
                postal_code: '2000',
                country_code: 'AU',
            },
        },
        items: [
            {
                description: 'Test item',
                quantity: 1,
                unitCode: 'EA',
                unitPrice: 1,
                currency: 'AUD',
            },
        ],
    },
};

describe('Test SQLearners - Orders Extra', () => {
    beforeAll(async () => {
        const registerRes = await request(BASE_URL)
            .post('/v1/auth/api-keys')
            .send({ name: TEST_NAME, email: TEST_EMAIL, password: TEST_PASSWORD });

        expect(registerRes.status).toBe(201);
        apiKey = registerRes.body.key;
        userId = registerRes.body.id;

        await request(BASE_URL)
            .post('/v1/orders')
            .set('Authorization', `Bearer ${apiKey}`)
            .send(validOrderBody);
    }, 30000);

    afterAll(async () => {
        await request(BASE_URL)
        .delete(`/v1/users/${userId}`)
        .set('Authorization', `Bearer ${apiKey}`);
    });

    // GET /v1/orders/last
    describe('GET /v1/orders/last', () => {

        test('Gets the last order made - returns 200', async () => {
            const res = await request(BASE_URL)
                .get('/v1/orders/last')
                .set('Authorization', `Bearer ${apiKey}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('id');
            expect(res.body).toHaveProperty('createdAt');
            expect(res.body).toHaveProperty('ublDocument');
            expect(res.body).toHaveProperty('jsonObj');
        });

        test('jsonObj correctly stored Buyer, Seller and items - returns 200', async () => {
            const res = await request(BASE_URL)
                .get('/v1/orders/last')
                .set('Authorization', `Bearer ${apiKey}`);

            expect(res.status).toBe(200);
            expect(res.body.jsonObj).toHaveProperty('BuyerCustomerParty');
            expect(res.body.jsonObj).toHaveProperty('SellerSupplierParty');
            expect(Array.isArray(res.body.jsonObj.items)).toBe(true);
            expect(res.body.jsonObj.items.length).toBeGreaterThan(0);
        });

        test('ublDocument is XML string - returns 200', async () => {
            const res = await request(BASE_URL)
                .get('/v1/orders/last')
                .set('Authorization', `Bearer ${apiKey}`);

            expect(res.status).toBe(200);
            expect(typeof res.body.ublDocument).toBe('string');
            expect(res.body.ublDocument.length).toBeGreaterThan(0);
        });

        test('no Authorization header - returns 401', async () => {
            const res = await request(BASE_URL)
                .get('/v1/orders/last');

            expect(res.status).toBe(401);
            expect(res.body).toHaveProperty('code');
            expect(res.body).toHaveProperty('message');
        });

        test('invalid token - returns 401', async () => {
            const res = await request(BASE_URL)
                .get('/v1/orders/last')
                .set('Authorization', 'Bearer invalid-token-xxx');

            expect(res.status).toBe(401);
        });        
    });

    // POST /v1/orders/smart
    describe('POST /v1/orders/smart', () => {

        test('Creates smart order with filled party details - returns 201', async () => {
            const res = await request(BASE_URL)
            .post('/v1/orders/smart')
            .set('Authorization', `Bearer ${apiKey}`)
            .send(validOrderBody);

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('id');
            expect(res.body).toHaveProperty('ublDocument');
            expect(res.body).toHaveProperty('jsonObj');
        });

        test('PartyLookUp works with party from smart order - returns 201', async () => {
            await request(BASE_URL)
                .post('/v1/orders/smart')
                .set('Authorization', `Bearer ${apiKey}`)
                .send(validOrderBody);

            const res = await request(BASE_URL)
            .post('/v1/orders/smart')
            .set('Authorization', `Bearer ${apiKey}`)
            .send({
                orderJson: {
                    BuyerCustomerParty: {PartyName: 'Test Buyer Party' },
                    SellerSupplierParty: { PartyName: 'Test Seller Party' },
                    items: validOrderBody.orderJson.items,
                },
            });
    
            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('id');
        });

        test('PartyLookUp invalid name - returns 404', async () => {
            const res = await request(BASE_URL)
            .post('/v1/orders/smart')
            .set('Authorization', `Bearer ${apiKey}`)
            .send({
                orderJson: {
                    BuyerCustomerParty: {PartyName: 'Invalid Buyer' },
                    SellerSupplierParty: validOrderBody.orderJson.SellerSupplierParty,
                    items: validOrderBody.orderJson.items,
                },
            });  

            expect(res.status).toBe(404);
        });

        test('Items missing from order - returns 400', async () => {
            const res = await request(BASE_URL)
            .post('/v1/orders/smart')
            .set('Authorization', `Bearer ${apiKey}`)
            .send({
                orderJson: {
                    BuyerCustomerParty: validOrderBody.orderJson.BuyerCustomerParty,
                    SellerSupplierParty: validOrderBody.orderJson.SellerSupplierParty,
                },
            });  

            expect(res.status).toBe(400);
        });

        test('Item below minimum quantity - returns 400', async () => {
            const res = await request(BASE_URL)
            .post('/v1/orders/smart')
            .set('Authorization', `Bearer ${apiKey}`)
            .send({
                orderJson: {
                    ...validOrderBody.orderJson,
                    items: [{ description: 'Below min test item', quantity: 0, unitCode: 'EA', unitPrice: 5, currency: 'AUD' }],
                },
            });

            expect(res.status).toBe(400);
        });

        test('No Authorization hedaer - returns 401', async () => {
            const res = await request(BASE_URL)
            .post('/v1/orders/smart')
            .send(validOrderBody);

            expect(res.status).toBe(401);
            expect(res.body).toHaveProperty('code');
        });

        test('Invalid token - returns 401', async () => {
            const res = await request(BASE_URL)
            .post('/v1/orders/smart')
            .set('Authorization', 'Bearer invalid-token-xxx')
            .send(validOrderBody);

            expect(res.status).toBe(401);
        });

    });
});
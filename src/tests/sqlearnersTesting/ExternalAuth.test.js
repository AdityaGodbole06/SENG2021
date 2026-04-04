/**
 * Test Auth functions by group SQLearners
 */
const request = require('supertest');

const BASE_URL = 'https://ordercreationapi.vercel.app';
const TEST_EMAIL = `authtest_${Date.now()}@testing.com`;
const TEST_PASSWORD = 'Testing123!';
const TEST_NAME = 'Auth Test User';

let apiKey;
let userId;

describe('Test SQLearners - Auth', () => {
    beforeAll(async () => {
        const registerRes = await request(BASE_URL)
            .post('/v1/auth/api-keys')
            .send({ name: TEST_NAME, email: TEST_EMAIL, password: TEST_PASSWORD });

        expect(registerRes.status).toBe(201);
        apiKey = registerRes.body.key;
        userId = registerRes.body.id;
    }, 30000);

    afterAll(async () => {
        await request(BASE_URL)
            .delete(`/v1/users/${userId}`)
            .set('Authorization', `Bearer ${apiKey}`);
    });

    // POST /v1/auth/api-keys
    describe('POST /v1/auth/api-keys', () => {

        test('Registers user and get API key - returns 201', async () => {
            const res = await request(BASE_URL)
                .post('/v1/auth/api-keys')
                .send({ name: TEST_NAME, email: `newuser_${Date.now()}@testing.com`, password: TEST_PASSWORD });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('id');
            expect(res.body).toHaveProperty('key');
            expect(res.body).toHaveProperty('name');
            expect(res.body).toHaveProperty('created_at');
        });

        test('Duplicate email - returns 409', async () => {
            const res = await request(BASE_URL)
                .post('/v1/auth/api-keys')
                .send({ name: TEST_NAME, email: TEST_EMAIL, password: TEST_PASSWORD });

            expect(res.status).toBe(409);
            expect(res.body).toHaveProperty('code');
            expect(res.body).toHaveProperty('message');
        });

        test('Missing email - returns 400', async () => {
            const res = await request(BASE_URL)
                .post('/v1/auth/api-keys')
                .send({ name: TEST_NAME, password: TEST_PASSWORD });

            expect(res.status).toBe(400);
        });

        test('Missing password - returns 400', async () => {
            const res = await request(BASE_URL)
                .post('/v1/auth/api-keys')
                .send({ name: TEST_NAME, email: `nopw_${Date.now()}@testing.com` });

            expect(res.status).toBe(400);
        });

        test('Missing name - returns 400', async () => {
            const res = await request(BASE_URL)
                .post('/v1/auth/api-keys')
                .send({ email: `noname_${Date.now()}@testing.com`, password: TEST_PASSWORD });

            expect(res.status).toBe(400);
        });

    });

    // POST /v1/auth/login
    describe('POST /v1/auth/login', () => {

        test('Valid login - returns 200', async () => {
            const res = await request(BASE_URL)
                .post('/v1/auth/login')
                .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('session');
            expect(res.body.session).toHaveProperty('access_token');
        });

        test('Authenticate login - returns 200/404', async () => {
            const loginRes = await request(BASE_URL)
                .post('/v1/auth/login')
                .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

            const token = loginRes.body.session.access_token;

            const res = await request(BASE_URL)
                .get('/v1/orders/last')
                .set('Authorization', `Bearer ${token}`);

            // 200 if orders exist, 404 if not — both mean auth worked
            expect([200, 404]).toContain(res.status);
        });

        test('Invalid password - returns 401', async () => {
            const res = await request(BASE_URL)
                .post('/v1/auth/login')
                .send({ email: TEST_EMAIL, password: 'invalidPassword!' });

            expect(res.status).toBe(401);
            expect(res.body).toHaveProperty('code');
            expect(res.body).toHaveProperty('message');
        });

        test('Missing email - returns 400', async () => {
            const res = await request(BASE_URL)
                .post('/v1/auth/login')
                .send({ password: TEST_PASSWORD });

            expect(res.status).toBe(400);
        });

        test('Missing password - returns 400', async () => {
            const res = await request(BASE_URL)
                .post('/v1/auth/login')
                .send({ email: TEST_EMAIL });

            expect(res.status).toBe(400);
        });

    });

    // POST /v1/auth/logout
    describe('POST /v1/auth/logout', () => {

        test('Valid logout - returns 204', async () => {
            const res = await request(BASE_URL)
                .post('/v1/auth/logout')
                .set('Authorization', `Bearer ${apiKey}`);

            expect(res.status).toBe(204);
        });

        test('No Authorization header - returns 401', async () => {
            const res = await request(BASE_URL)
                .post('/v1/auth/logout');

            expect(res.status).toBe(401);
            expect(res.body).toHaveProperty('code');
            expect(res.body).toHaveProperty('message');
        });

        test('Invalid token - returns 204 (undocumented behaviour)', async () => {
            // NOTE: docs state this should return 401, but the API returns 204
            const res = await request(BASE_URL)
                .post('/v1/auth/logout')
                .set('Authorization', 'Bearer invalid-token-xxx');

            expect(res.status).toBe(204);
        });

    });
});

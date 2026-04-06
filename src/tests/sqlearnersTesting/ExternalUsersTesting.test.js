/**
 * Test User endpoints by group SQLearners (Streamlined - 15 tests)
 */
const request = require('supertest');

const BASE_URL = 'https://ordercreationapi.vercel.app';
const TEST_EMAIL = `usertest_${Date.now()}@testing.com`;
const TEST_PASSWORD = 'Testing123!';
const TEST_NAME = 'Test User';

let authToken;
let userId;
let createdUserIds = [];

describe('Test SQLearners - Users', () => {
    beforeAll(async () => {
        // Create initial test user
        const registerRes = await request(BASE_URL)
            .post('/v1/auth/api-keys')
            .send({ name: TEST_NAME, email: TEST_EMAIL, password: TEST_PASSWORD });

        expect(registerRes.status).toBe(201);

        // Login to get session token
        const loginRes = await request(BASE_URL)
            .post('/v1/auth/login')
            .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

        expect(loginRes.status).toBe(200);
        authToken = loginRes.body.session.access_token;
        userId = loginRes.body.session.user.id;
    }, 30000);

    afterAll(async () => {
        // Clean up test user
        await request(BASE_URL)
            .delete(`/v1/users/${userId}`)
            .set('Authorization', `Bearer ${authToken}`);

        // Clean up any created users
        for (const createdId of createdUserIds) {
            await request(BASE_URL)
                .delete(`/v1/users/${createdId}`)
                .set('Authorization', `Bearer ${authToken}`);
        }
    });

    // POST /v1/users
    describe('POST /v1/users', () => {
        test('Success (201): Create new user', async () => {
            const res = await request(BASE_URL)
                .post('/v1/users')
                .send({
                    name: 'New User',
                    email: `newuser_${Date.now()}@testing.com`,
                    password: 'Password123!'
                });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('id');
            createdUserIds.push(res.body.id);
        });

        test('Error (400): Missing required fields', async () => {
            const res = await request(BASE_URL)
                .post('/v1/users')
                .send({ email: `noname_${Date.now()}@testing.com` });

            expect(res.status).toBe(400);
        });

        test('Error (409): Duplicate email', async () => {
            const res = await request(BASE_URL)
                .post('/v1/users')
                .send({
                    name: TEST_NAME,
                    email: TEST_EMAIL,
                    password: TEST_PASSWORD
                });

            expect(res.status).toBe(409);
        });

        test('Error (400): Weak password', async () => {
            const res = await request(BASE_URL)
                .post('/v1/users')
                .send({
                    name: 'Test User',
                    email: `weakpw_${Date.now()}@testing.com`,
                    password: '123'
                });

            expect(res.status).toBe(400);
        });
    });

    // GET /v1/users/{userId}
    describe('GET /v1/users/{userId}', () => {
        test('Success (200): Get user details', async () => {
            const res = await request(BASE_URL)
                .get(`/v1/users/${userId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            expect(res.body.id).toBe(userId);
        });

        test('Error (401): Missing Authorization header', async () => {
            const res = await request(BASE_URL)
                .get(`/v1/users/${userId}`);

            expect(res.status).toBe(401);
        });

        test('Security (403/404): Cannot access another user\'s details', async () => {
            const otherEmail = `otheruser_${Date.now()}@testing.com`;
            await request(BASE_URL)
                .post('/v1/auth/api-keys')
                .send({ name: 'Other User', email: otherEmail, password: 'Password123!' });

            const loginRes = await request(BASE_URL)
                .post('/v1/auth/login')
                .send({ email: otherEmail, password: 'Password123!' });

            const otherToken = loginRes.body.session.access_token;
            const otherUserId = loginRes.body.session.user.id;
            createdUserIds.push(otherUserId);

            const res = await request(BASE_URL)
                .get(`/v1/users/${userId}`)
                .set('Authorization', `Bearer ${otherToken}`);

            expect([403, 404]).toContain(res.status);
        });
    });

    // PUT /v1/users/{userId}
    describe('PUT /v1/users/{userId}', () => {
        test('Success (200): Update user', async () => {
            const res = await request(BASE_URL)
                .put(`/v1/users/${userId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ name: 'Updated Name' });

            expect(res.status).toBe(200);
            expect(res.body.name).toBe('Updated Name');
        });

        test('Error (401): Missing Authorization header', async () => {
            const res = await request(BASE_URL)
                .put(`/v1/users/${userId}`)
                .send({ name: 'Hacker Name' });

            expect(res.status).toBe(401);
        });

        test('Error (404): Non-existent user ID', async () => {
            const fakeId = '00000000-0000-4000-a000-000000000000';
            const res = await request(BASE_URL)
                .put(`/v1/users/${fakeId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ name: 'New Name' });

            expect(res.status).toBe(404);
        });

        test('Security (403/404): Cannot update another user\'s account', async () => {
            const otherEmail = `updatetest_${Date.now()}@testing.com`;
            await request(BASE_URL)
                .post('/v1/auth/api-keys')
                .send({ name: 'Update Test', email: otherEmail, password: 'Password123!' });

            const loginRes = await request(BASE_URL)
                .post('/v1/auth/login')
                .send({ email: otherEmail, password: 'Password123!' });

            const otherToken = loginRes.body.session.access_token;
            const otherUserId = loginRes.body.session.user.id;
            createdUserIds.push(otherUserId);

            const res = await request(BASE_URL)
                .put(`/v1/users/${userId}`)
                .set('Authorization', `Bearer ${otherToken}`)
                .send({ name: 'Hacked Name' });

            expect([403, 404]).toContain(res.status);
        });
    });

    // DELETE /v1/users/{userId}
    describe('DELETE /v1/users/{userId}', () => {
        test('Success (200/204): Delete user account', async () => {
            const deleteEmail = `deletetest_${Date.now()}@testing.com`;
            await request(BASE_URL)
                .post('/v1/auth/api-keys')
                .send({ name: 'Delete Test', email: deleteEmail, password: 'Password123!' });

            const loginRes = await request(BASE_URL)
                .post('/v1/auth/login')
                .send({ email: deleteEmail, password: 'Password123!' });

            const deleteToken = loginRes.body.session.access_token;
            const deleteUserId = loginRes.body.session.user.id;

            const res = await request(BASE_URL)
                .delete(`/v1/users/${deleteUserId}`)
                .set('Authorization', `Bearer ${deleteToken}`);

            expect([200, 204]).toContain(res.status);
        });

        test('Error (401): Missing Authorization header', async () => {
            const res = await request(BASE_URL)
                .delete(`/v1/users/${userId}`);

            expect(res.status).toBe(401);
        });

        test('Error (404): Non-existent user ID', async () => {
            const fakeId = '00000000-0000-4000-a000-000000000000';
            const res = await request(BASE_URL)
                .delete(`/v1/users/${fakeId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(404);
        });

        test('Security (403/404): Cannot delete another user\'s account', async () => {
            const delSecEmail = `delsec_${Date.now()}@testing.com`;
            await request(BASE_URL)
                .post('/v1/auth/api-keys')
                .send({ name: 'Del Sec', email: delSecEmail, password: 'Password123!' });

            const loginRes = await request(BASE_URL)
                .post('/v1/auth/login')
                .send({ email: delSecEmail, password: 'Password123!' });

            const otherToken = loginRes.body.session.access_token;
            const otherUserId = loginRes.body.session.user.id;
            createdUserIds.push(otherUserId);

            const res = await request(BASE_URL)
                .delete(`/v1/users/${userId}`)
                .set('Authorization', `Bearer ${otherToken}`);

            expect([403, 404]).toContain(res.status);
        });
    });
});

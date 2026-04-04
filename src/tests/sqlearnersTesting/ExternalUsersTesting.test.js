/**
 * Test User endpoints by group SQLearners
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

        // Login to get session token (required for user endpoints)
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

        test('Success (201): Create new user with all fields', async () => {
            const res = await request(BASE_URL)
                .post('/v1/users')
                .send({
                    name: 'New User',
                    email: `newuser_${Date.now()}@testing.com`,
                    password: 'Password123!'
                });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('id');
            expect(res.body).toHaveProperty('name');
            expect(res.body).toHaveProperty('email');
            createdUserIds.push(res.body.id);
        });

        test('Error (400): Missing name field', async () => {
            const res = await request(BASE_URL)
                .post('/v1/users')
                .send({
                    email: `noname_${Date.now()}@testing.com`,
                    password: 'Password123!'
                });

            expect(res.status).toBe(400);
        });

        test('Error (400): Missing email field', async () => {
            const res = await request(BASE_URL)
                .post('/v1/users')
                .send({
                    name: 'Test User',
                    password: 'Password123!'
                });

            expect(res.status).toBe(400);
        });

        test('Error (400): Missing password field', async () => {
            const res = await request(BASE_URL)
                .post('/v1/users')
                .send({
                    name: 'Test User',
                    email: `nopw_${Date.now()}@testing.com`
                });

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
            expect(res.body).toHaveProperty('code');
            expect(res.body).toHaveProperty('message');
        });

        test('Error (400): Invalid email format', async () => {
            const res = await request(BASE_URL)
                .post('/v1/users')
                .send({
                    name: 'Test User',
                    email: 'not-a-valid-email',
                    password: 'Password123!'
                });

            expect(res.status).toBe(400);
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

        test('Success (200): Get user details with authentication', async () => {
            const res = await request(BASE_URL)
                .get(`/v1/users/${userId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('id');
            expect(res.body).toHaveProperty('name');
            expect(res.body).toHaveProperty('email');
            expect(res.body.id).toBe(userId);
        });

        test('Error (401): Missing Authorization header', async () => {
            const res = await request(BASE_URL)
                .get(`/v1/users/${userId}`);

            expect(res.status).toBe(401);
            expect(res.body).toHaveProperty('code');
            expect(res.body).toHaveProperty('message');
        });

        test('Error (401): Invalid token', async () => {
            const res = await request(BASE_URL)
                .get(`/v1/users/${userId}`)
                .set('Authorization', 'Bearer invalid-token-xxx');

            expect(res.status).toBe(401);
        });

        test('Error (404): Non-existent user ID', async () => {
            const fakeId = '00000000-0000-4000-a000-000000000000';
            const res = await request(BASE_URL)
                .get(`/v1/users/${fakeId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(404);
        });

        test('Error (400): Malformed user ID', async () => {
            const res = await request(BASE_URL)
                .get('/v1/users/invalid-id-syntax!!!')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(400);
        });

        test('Security (403): Cannot access another user\'s details', async () => {
            // Create another user
            const otherEmail = `otheruser_${Date.now()}@testing.com`;
            const registerRes = await request(BASE_URL)
                .post('/v1/auth/api-keys')
                .send({ name: 'Other User', email: otherEmail, password: 'Password123!' });

            const loginRes = await request(BASE_URL)
                .post('/v1/auth/login')
                .send({ email: otherEmail, password: 'Password123!' });

            const otherUserId = loginRes.body.session.user.id;
            const otherToken = loginRes.body.session.access_token;
            createdUserIds.push(otherUserId);

            // Try to access first user's details with second user's token
            const res = await request(BASE_URL)
                .get(`/v1/users/${userId}`)
                .set('Authorization', `Bearer ${otherToken}`);

            // Should be 403 Forbidden or 404 Not Found depending on implementation
            expect([403, 404]).toContain(res.status);
        });
    });

    // PUT /v1/users/{userId}
    describe('PUT /v1/users/{userId}', () => {

        test('Success (200): Update user name', async () => {
            const res = await request(BASE_URL)
                .put(`/v1/users/${userId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ name: 'Updated Name' });

            expect(res.status).toBe(200);
            expect(res.body.name).toBe('Updated Name');
        });

        test('Success (200): Update user email', async () => {
            const newEmail = `updated_${Date.now()}@testing.com`;
            const res = await request(BASE_URL)
                .put(`/v1/users/${userId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ email: newEmail });

            expect(res.status).toBe(200);
            expect(res.body.email).toBe(newEmail);
        });

        test('Success (200): Update password', async () => {
            const newPassword = 'NewPassword123!';
            const res = await request(BASE_URL)
                .put(`/v1/users/${userId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ password: newPassword });

            expect(res.status).toBe(200);
        });

        test('Success (200): Update multiple fields at once', async () => {
            const res = await request(BASE_URL)
                .put(`/v1/users/${userId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: 'Multi Updated',
                    password: 'AnotherPassword123!'
                });

            expect(res.status).toBe(200);
            expect(res.body.name).toBe('Multi Updated');
        });

        test('Error (401): Missing Authorization header', async () => {
            const res = await request(BASE_URL)
                .put(`/v1/users/${userId}`)
                .send({ name: 'Hacker Name' });

            expect(res.status).toBe(401);
        });

        test('Error (401): Invalid token', async () => {
            const res = await request(BASE_URL)
                .put(`/v1/users/${userId}`)
                .set('Authorization', 'Bearer invalid-token-xxx')
                .send({ name: 'Hacker Name' });

            expect(res.status).toBe(401);
        });

        test('Error (400): Malformed user ID', async () => {
            const res = await request(BASE_URL)
                .put('/v1/users/invalid-id-syntax!!!')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ name: 'New Name' });

            expect(res.status).toBe(400);
        });

        test('Error (404): Non-existent user ID', async () => {
            const fakeId = '00000000-0000-4000-a000-000000000000';
            const res = await request(BASE_URL)
                .put(`/v1/users/${fakeId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ name: 'New Name' });

            expect(res.status).toBe(404);
        });

        test('Error (400): Invalid email format', async () => {
            const res = await request(BASE_URL)
                .put(`/v1/users/${userId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ email: 'not-a-valid-email' });

            expect(res.status).toBe(400);
        });

        test('Error (409): Duplicate email', async () => {
            // Create a second user first
            const secondEmail = `seconduser_${Date.now()}@testing.com`;
            await request(BASE_URL)
                .post('/v1/auth/api-keys')
                .send({ name: 'Second User', email: secondEmail, password: 'Password123!' });

            const loginRes = await request(BASE_URL)
                .post('/v1/auth/login')
                .send({ email: secondEmail, password: 'Password123!' });

            const secondUserId = loginRes.body.session.user.id;
            const secondToken = loginRes.body.session.access_token;
            createdUserIds.push(secondUserId);

            // Try to update the second user's email to match the first user's
            const res = await request(BASE_URL)
                .put(`/v1/users/${secondUserId}`)
                .set('Authorization', `Bearer ${secondToken}`)
                .send({ email: TEST_EMAIL });

            expect(res.status).toBe(409);
        });

        test('Security (403): Cannot update another user\'s account', async () => {
            // Create another user
            const otherEmail = `securitytest_${Date.now()}@testing.com`;
            await request(BASE_URL)
                .post('/v1/auth/api-keys')
                .send({ name: 'Security Test', email: otherEmail, password: 'Password123!' });

            const loginRes = await request(BASE_URL)
                .post('/v1/auth/login')
                .send({ email: otherEmail, password: 'Password123!' });

            const otherUserId = loginRes.body.session.user.id;
            const otherToken = loginRes.body.session.access_token;
            createdUserIds.push(otherUserId);

            // Try to update first user with second user's token
            const res = await request(BASE_URL)
                .put(`/v1/users/${userId}`)
                .set('Authorization', `Bearer ${otherToken}`)
                .send({ name: 'Hacked Name' });

            // Should be 403 Forbidden or 404 Not Found
            expect([403, 404]).toContain(res.status);
        });
    });

    // DELETE /v1/users/{userId}
    describe('DELETE /v1/users/{userId}', () => {

        test('Success (200): Delete user account', async () => {
            // Create a user specifically for deletion
            const deleteEmail = `deletetest_${Date.now()}@testing.com`;
            await request(BASE_URL)
                .post('/v1/auth/api-keys')
                .send({ name: 'Delete Test', email: deleteEmail, password: 'Password123!' });

            const loginRes = await request(BASE_URL)
                .post('/v1/auth/login')
                .send({ email: deleteEmail, password: 'Password123!' });

            const deleteUserId = loginRes.body.session.user.id;
            const deleteToken = loginRes.body.session.access_token;

            const res = await request(BASE_URL)
                .delete(`/v1/users/${deleteUserId}`)
                .set('Authorization', `Bearer ${deleteToken}`);

            expect(res.status).toBe(200);

            // Verify user is deleted by trying to get them
            const getRes = await request(BASE_URL)
                .get(`/v1/users/${deleteUserId}`)
                .set('Authorization', `Bearer ${deleteToken}`);

            expect([401, 404]).toContain(getRes.status);
        });

        test('Error (401): Missing Authorization header', async () => {
            const res = await request(BASE_URL)
                .delete(`/v1/users/${userId}`);

            expect(res.status).toBe(401);
        });

        test('Error (401): Invalid token', async () => {
            const res = await request(BASE_URL)
                .delete(`/v1/users/${userId}`)
                .set('Authorization', 'Bearer invalid-token-xxx');

            expect(res.status).toBe(401);
        });

        test('Error (400): Malformed user ID', async () => {
            const res = await request(BASE_URL)
                .delete('/v1/users/invalid-id-syntax!!!')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(400);
        });

        test('Error (404): Non-existent user ID', async () => {
            const fakeId = '00000000-0000-4000-a000-000000000000';
            const res = await request(BASE_URL)
                .delete(`/v1/users/${fakeId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(404);
        });

        test('Security (403): Cannot delete another user\'s account', async () => {
            // Create another user
            const otherEmail = `delsecurity_${Date.now()}@testing.com`;
            await request(BASE_URL)
                .post('/v1/auth/api-keys')
                .send({ name: 'Del Security', email: otherEmail, password: 'Password123!' });

            const loginRes = await request(BASE_URL)
                .post('/v1/auth/login')
                .send({ email: otherEmail, password: 'Password123!' });

            const otherUserId = loginRes.body.session.user.id;
            const otherToken = loginRes.body.session.access_token;
            createdUserIds.push(otherUserId);

            // Try to delete first user with second user's token
            const res = await request(BASE_URL)
                .delete(`/v1/users/${userId}`)
                .set('Authorization', `Bearer ${otherToken}`);

            // Should be 403 Forbidden or 404 Not Found
            expect([403, 404]).toContain(res.status);

            // Verify original user still exists
            const getRes = await request(BASE_URL)
                .get(`/v1/users/${userId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(getRes.status).toBe(200);
        });
    });
});

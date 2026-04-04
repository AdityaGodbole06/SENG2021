/**
 * Test System functions by group SQLearners
 */
const request = require('supertest');

const BASE_URL = 'https://ordercreationapi.vercel.app';

describe('Test SQLearners - System', () => {

    // GET /health
    describe('GET /health', () => {

        test('Server is running and healthy - returns 200', async () => {
            const res = await request(BASE_URL)
                .get('/health');

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('status');
            expect(res.body.status).toBe('OK');
        });

        test('Returns timestamp - returns 200', async () => {
            const res = await request(BASE_URL)
                .get('/health');

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('timestamp');
            expect(new Date(res.body.timestamp).toString()).not.toBe('Invalid Date');
        });

    });

});

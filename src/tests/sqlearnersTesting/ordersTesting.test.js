const request = require('supertest');
const TEAM_B_URL = 'https://ordercreationapi.vercel.app';

/**
 * 1. UTILITIES & FACTORIES
 */
const setPath = (obj, path, value) => {
    const parts = path.split('.');
    const last = parts.pop();
    const target = parts.reduce((acc, part) => acc[part], obj);
    if (value === undefined) delete target[last];
    else target[last] = value;
};

const getValidOrder = () => ({
    orderJson: {
        BuyerCustomerParty: {
            PartyIdentification: "B-001", PartyName: "Buyer Inc", PartyLegalEntity: "Corp", tax_id: "AU123",
            address: { street: "123 St", city: "Sydney", state: "NSW", postal_code: "2000", country_code: "AU" },
            contact: { name: "John", email: "john@test.com", phone: "0400000000" }
        },
        SellerSupplierParty: {
            PartyIdentification: "S-001", PartyName: "Seller Ltd", PartyLegalEntity: "Ltd", tax_id: "AU456",
            address: { street: "456 Rd", city: "Melbourne", state: "VIC", postal_code: "3000", country_code: "AU" },
            contact: { name: "Jane", email: "jane@test.com", phone: "0411111111" }
        },
        items: [{ description: "Widget", quantity: 5, unitCode: "EA", unitPrice: 10, currency: "AUD" }]
    }
});

/**
 * 2. GLOBAL SETUP & CLEANUP VARIABLES
 */
let authToken;
let testUserEmail;
let createdIds = [];

/**
 * 3. EXHAUSTIVE VALIDATION (GUEST MODE)
 */
describe('POST order tests guest mode', () => {

    test('Success (201): Should return XML and verify contents', async () => {
        const testData = getValidOrder();
        const res = await request(TEAM_B_URL).post('/v1/orders').send(testData);
        expect(res.statusCode).toBe(201);
        expect(res.body.ublDocument).toContain(testData.orderJson.BuyerCustomerParty.PartyName);
    });

    // Party Symmetry Tests (Your 14 original tests)
    const partyFields = ['PartyName', 'address.street', 'address.city', 'address.postal_code', 'address.country_code', 'contact.name', 'contact.email'];
    const partyPaths = [];
    ['BuyerCustomerParty', 'SellerSupplierParty'].forEach(p => {
        partyFields.forEach(f => partyPaths.push(`orderJson.${p}.${f}`));
    });

    test.each(partyPaths)('Required Check: %s', async (path) => {
        const payload = getValidOrder();
        setPath(payload, path, undefined);
        const res = await request(TEAM_B_URL).post('/v1/orders').send(payload);
        expect(res.statusCode).toBe(400);
    }, 10000);

    // Item Logic Tests
    const itemPaths = ['orderJson.items.0.description', 'orderJson.items.0.quantity', 'orderJson.items.0.unitCode', 'orderJson.items.0.unitPrice', 'orderJson.items.0.currency'];
    test.each(itemPaths)('Item Field Check: %s', async (path) => {
        const payload = getValidOrder();
        setPath(payload, path, undefined);
        const res = await request(TEAM_B_URL).post('/v1/orders').send(payload);
        expect(res.statusCode).toBe(400);
    });

    // Data Type Integrity (The 6 tests you had)
    const typeValidationCases = [
        { path: 'orderJson.BuyerCustomerParty.PartyName', value: 12345 },
        { path: 'orderJson.BuyerCustomerParty.address', value: "Sydney" },
        { path: 'orderJson.BuyerCustomerParty.contact.email', value: { email: "test" } },
        { path: 'orderJson.items', value: "string_not_array" },
        { path: 'orderJson.items.0.quantity', value: "string_not_num" },
        { path: 'orderJson.items.0.unitPrice', value: true }
    ];
    test.each(typeValidationCases)('Type Integrity: %s', async ({ path, value }) => {
        const payload = getValidOrder();
        setPath(payload, path, value);
        const res = await request(TEAM_B_URL).post('/v1/orders').send(payload);
        expect(res.statusCode).toBe(400);
    });
    // ---  EDGE CASES & BUSINESS LOGIC ---
    const edgeCaseTests = [
      { 
        label: 'Negative Quantity', 
        path: 'orderJson.items.0.quantity', 
        value: -1 
      },
      { 
        label: 'Invalid Email Format', 
        path: 'orderJson.BuyerCustomerParty.contact.email', 
        value: 'not-an-email-address' 
      },
      { 
        label: 'Empty Item List', 
        path: 'orderJson.items', 
        value: [] 
      },
      { 
        label: 'Zero Unit Price', 
        path: 'orderJson.items.0.unitPrice', 
        value: 0 
      }
    ];

    describe('Team B Order API - Business Logic & Boundary Checks', () => {
      test.each(edgeCaseTests)('Edge Case: $label', async ({ path, value }) => {
        const payload = getValidOrder();
        setPath(payload, path, value);

        const res = await request(TEAM_B_URL).post('/v1/orders').send(payload);

        // If these return 201, it means Team B didn't add logic to stop 
        // negative numbers or empty orders. Use this as a "Bug" in your report!
        if (res.statusCode === 201) {
          console.warn(`⚠️ LOGIC GAP: API accepted ${value} for ${path}`);
        }

        expect(res.statusCode).toBe(400); 
      }, 10000);
  });
});

/**
 * 4. AUTHENTICATED LIFECYCLE & SECURITY
 */
describe('Authorized sets', () => {

  beforeAll(async () => {
      testUserEmail = `tester_${Date.now()}@example.com`;
      const user = { name: "Tester", email: testUserEmail, password: "Password123" };
      await request(TEAM_B_URL).post('/v1/users').send(user);
      const login = await request(TEAM_B_URL).post('/v1/auth/login').send({ email: user.email, password: user.password });
      authToken = login.body.session.access_token;
  });

  afterAll(async () => {
      for (const id of createdIds) {
          await request(TEAM_B_URL).delete(`/v1/orders/${id}`).set('Authorization', `Bearer ${authToken}`);
      }
      await request(TEAM_B_URL).delete('/v1/users').set('Authorization', `Bearer ${authToken}`);
  });
  
  describe('GET /v1/orders tests', () => {
    test('Success (201): Create and track multiple orders', async () => {
      for(let i=0; i<2; i++) {
          const res = await request(TEAM_B_URL).post('/v1/orders').set('Authorization', `Bearer ${authToken}`).send(getValidOrder());
          createdIds.push(res.body.id);
      }
      const history = await request(TEAM_B_URL).get('/v1/orders').set('Authorization', `Bearer ${authToken}`);
      expect(history.statusCode).toBe(200);
      expect(history.body.length).toBeGreaterThanOrEqual(2);
    });
    test('Failure (401): Missing Token', async () => {
      const history = await request(TEAM_B_URL).get('/v1/orders');
      expect(history.statusCode).toBe(401);
    });

    test('Failure (401): Invalid Token', async () => {
      const history = await request(TEAM_B_URL).get('/v1/orders').set('Authorization', `Bearer ADAasfasfa`);
      expect(history.statusCode).toBe(401);
    });

    

    test('Guest Isolation: Guest orders not in history', async () => {
        const guest = await request(TEAM_B_URL).post('/v1/orders').send(getValidOrder());
        const history = await request(TEAM_B_URL).get('/v1/orders').set('Authorization', `Bearer ${authToken}`);
        expect(history.body.some(o => o.id === guest.body.id)).toBe(false);
    });
  });

  describe('Get /v1/orders/:orderid tests', () => {
    test('Success (200): Get Single Order by ID', async () => {
      const id = createdIds[0];
      const res = await request(TEAM_B_URL).get(`/v1/orders/${id}`).set('Authorization', `Bearer ${authToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.id).toBe(id);
    });

    test('Failure (401): Missing Token', async () => {
      const id = createdIds[0];
      const res = await request(TEAM_B_URL).get(`/v1/orders/${id}`);
      expect(res.statusCode).toBe(401);
    });

    test('Failure (401): Invalid Token', async () => {
      const id = createdIds[0];
      const res = await request(TEAM_B_URL).get(`/v1/orders/${id}`).set('Authorization', `Bearer ADAasfasfa`);
      expect(res.statusCode).toBe(401);
    });

    test('Failure - Security (403): Deny cross-user access', async () => {
      const attackerEmail = `hacker_${Date.now()}@test.com`;
      await request(TEAM_B_URL).post('/v1/users').send({ email: attackerEmail, password: "123", name: "H" });
      const log = await request(TEAM_B_URL).post('/v1/auth/login').send({ email: attackerEmail, password: "123" });
      const res = await request(TEAM_B_URL).get(`/v1/orders/${createdIds[0]}`).set('Authorization', `Bearer ${log.body.session.access_token}`);
      expect(res.statusCode).toBe(403);
    });

    test('404 OrderId does not exist', async () => {
      const validButMissingId = "00000000-0000-4000-a000-000000000000"; 
      const res = await request(TEAM_B_URL)
        .get(`/v1/orders/${validButMissingId}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.statusCode).toBe(404);
    });
  })

  describe('Put /v1/orders/:orderid tests', () => { 
    test('Success (200): Should update order fields and verify persistence', async () => {
      const targetId = createdIds[0];
      
      const updatedData = getValidOrder();
      updatedData.orderJson.BuyerCustomerParty.PartyName = "UPDATED Buyer Inc";
      updatedData.orderJson.items[0].quantity = 99;

      const putRes = await request(TEAM_B_URL)
        .put(`/v1/orders/${targetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updatedData);

      expect(putRes.statusCode).toBe(200);
      expect(putRes.body.jsonObj.BuyerCustomerParty.PartyName).toBe("UPDATED Buyer Inc");

      const getRes = await request(TEAM_B_URL)
        .get(`/v1/orders/${targetId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(getRes.body.jsonObj.BuyerCustomerParty.PartyName).toBe("UPDATED Buyer Inc");
      expect(getRes.body.jsonObj.items[0].quantity).toBe(99);
      console.log("Verified: PUT update is persistent in the database.");
    });

    test('Security (403): Should prevent updating another user\'s order', async () => {
      const attacker = { email: `hacker_put_${Date.now()}@test.com`, password: "123", name: "Hacker" };
      await request(TEAM_B_URL).post('/v1/users').send(attacker);
      const login = await request(TEAM_B_URL).post('/v1/auth/login').send({ email: attacker.email, password: attacker.password });
      const attackerToken = login.body.session.access_token;

      const victimOrderId = createdIds[0];
      const res = await request(TEAM_B_URL)
        .put(`/v1/orders/${victimOrderId}`)
        .set('Authorization', `Bearer ${attackerToken}`)
        .send(getValidOrder());

      expect(res.statusCode).toBe(403);
      expect(res.body.code).toBe("FORBIDDEN");
    });

    test('Error (400):  malformed ID in PUT', async () => {
      const res = await request(TEAM_B_URL)
        .put('/v1/orders/not-a-uuid-!!!')
        .set('Authorization', `Bearer ${authToken}`)
        .send(getValidOrder());

      //bug!
      expect(res.statusCode).toBe(400);
    });

    test('Error (404): Should return USER_NOT_FOUND for non-existent UUID', async () => {
      const validButMissingId = "00000000-0000-4000-a000-000000000000"; 
      const res = await request(TEAM_B_URL)
        .put(`/v1/orders/${validButMissingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(getValidOrder());

      expect(res.statusCode).toBe(404);
    });

    test('Security (401): Should reject PUT if token is missing', async () => {
      const res = await request(TEAM_B_URL)
        .put(`/v1/orders/${createdIds[0]}`)
        .send(getValidOrder());

      expect(res.statusCode).toBe(401);
    });

    test('Deep Update (200): Should update nested fields and preserve unrelated data', async () => {
      const targetId = createdIds[0];
      const originalRes = await request(TEAM_B_URL)
        .get(`/v1/orders/${targetId}`)
        .set('Authorization', `Bearer ${authToken}`);
      const originalSeller = originalRes.body.jsonObj.SellerSupplierParty.PartyName;

      const updatedData = getValidOrder();
      updatedData.orderJson.BuyerCustomerParty.PartyName = "Major Refactor Inc"; // Top level
      updatedData.orderJson.BuyerCustomerParty.address.city = "Perth";          // Nested level
      updatedData.orderJson.items[0].description = "Upgraded Widget";          // Array level

      await request(TEAM_B_URL)
        .put(`/v1/orders/${targetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updatedData);

      const finalRes = await request(TEAM_B_URL)
        .get(`/v1/orders/${targetId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(finalRes.body.jsonObj.BuyerCustomerParty.PartyName).toBe("Major Refactor Inc");
      expect(finalRes.body.jsonObj.BuyerCustomerParty.address.city).toBe("Perth");
      
      expect(finalRes.body.jsonObj.SellerSupplierParty.PartyName).toBe(originalSeller);
    });
  });
  describe('DELETE /v1/orders/:orderId - Resource Termination', () => {
    test('Success (200): Should delete an order and verify it is gone', async () => {
      const tempOrder = await request(TEAM_B_URL)
        .post('/v1/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(getValidOrder());
      
      const deleteId = tempOrder.body.id;

      const delRes = await request(TEAM_B_URL)
        .delete(`/v1/orders/${deleteId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(delRes.statusCode).toBe(200);

      const getRes = await request(TEAM_B_URL)
        .get(`/v1/orders/${deleteId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(getRes.statusCode).toBe(404);
    });

    test('Security (403): Should prevent a user from deleting someone else\'s order', async () => {
      // Create a second 'Attacker' user
      const attackerEmail = `attacker_del_${Date.now()}@test.com`;
      await request(TEAM_B_URL).post('/v1/users').send({ email: attackerEmail, password: "123", name: "Hacker" });
      const login = await request(TEAM_B_URL).post('/v1/auth/login').send({ email: attackerEmail, password: "123" });
      const attackerToken = login.body.session.access_token;

      // Attempt to delete User A's order using Attacker's token
      const victimId = createdIds[0];
      const res = await request(TEAM_B_URL)
        .delete(`/v1/orders/${victimId}`)
        .set('Authorization', `Bearer ${attackerToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.code).toBe("FORBIDDEN");
    });

    test('Error (400): Should return for malformed ID', async () => {
      const res = await request(TEAM_B_URL)
        .delete('/v1/orders/invalid-id-syntax!!!')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe("INVALID_USERID_SYNTAX");
    });

    test('Error (404): Should return  if ID does not exist', async () => {
      const fakeId = "00000000-0000-4000-a000-000000000000";
      const res = await request(TEAM_B_URL)
        .delete(`/v1/orders/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
    });

    test('Security (401): Should reject DELETE if token is missing', async () => {
      const res = await request(TEAM_B_URL).delete(`/v1/orders/${createdIds[0]}`);
      expect(res.statusCode).toBe(401);
    });
  });
});
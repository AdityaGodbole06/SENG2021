jest.setTimeout(60000);

const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const http = require('http');

const BASE_URL = 'http://localhost:3099';
let mongod, server, browser, page, app;

// Helper: make an API call via puppeteer's browser context
async function api(method, path, body, token) {
  return page.evaluate(
    async ({ method, url, body, token }) => {
      const opts = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      };
      const res = await fetch(url, opts);
      let data;
      try { data = await res.json(); } catch { data = null; }
      return { status: res.status, data };
    },
    { method, url: `${BASE_URL}${path}`, body, token }
  );
}

// Register + login helper
async function registerAndLogin(partyId, password, role, name) {
  await api('POST', '/api/auth/register', { partyId, password, role, name: name || partyId });
  const r = await api('POST', '/api/auth/login', { partyId, password });
  return r.data?.token;
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  await mongoose.disconnect().catch(() => {});

  // Require app after setting MONGODB_URI so connectDB() picks up the in-memory URI
  app = require('../app');

  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(3099, resolve);
  });

  browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  page = await browser.newPage();
  await page.goto(BASE_URL);
}, 60000);

afterAll(async () => {
  await browser?.close();
  await new Promise((r) => server?.close(r));
  await mongoose.disconnect().catch(() => {});
  await mongod?.stop();
}, 30000);

// ─── Auth ────────────────────────────────────────────────────────────────────
describe('Auth', () => {
  const uid = `party-auth-${Date.now()}`;

  test('register creates a party', async () => {
    const r = await api('POST', '/api/auth/register', {
      partyId: uid, password: 'pass123', role: 'DESPATCH_PARTY', name: 'Test',
    });
    expect(r.status).toBe(201);
    expect(r.data.party?.partyId).toBe(uid);
  });

  test('duplicate register returns 409', async () => {
    const r = await api('POST', '/api/auth/register', {
      partyId: uid, password: 'pass123', role: 'DESPATCH_PARTY', name: 'Test',
    });
    expect(r.status).toBe(409);
  });

  test('login returns token', async () => {
    const r = await api('POST', '/api/auth/login', { partyId: uid, password: 'pass123' });
    expect(r.status).toBe(200);
    expect(r.data.token).toBeTruthy();
  });

  test('login wrong password returns 401', async () => {
    const r = await api('POST', '/api/auth/login', { partyId: uid, password: 'wrong' });
    expect(r.status).toBe(401);
  });

  test('register missing fields returns 400', async () => {
    const r = await api('POST', '/api/auth/register', { partyId: 'x' });
    expect(r.status).toBe(400);
  });
});

// ─── Orders ──────────────────────────────────────────────────────────────────
describe('Orders', () => {
  let token;
  const suffix = Date.now();
  const orderNum = `ORD-${suffix}`;

  beforeAll(async () => {
    token = await registerAndLogin(`seller-${suffix}`, 'pass123', 'DESPATCH_PARTY');
  });

  test('create order successfully', async () => {
    const r = await api('POST', '/api/orders', {
      orderNumber: orderNum,
      buyerParty: 'BuyerCo',
      sellerParty: 'SellerCo',
      amount: 250.00,
      orderDate: '2025-06-01',
      deliveryDate: '2025-06-15',
    }, token);
    expect(r.status).toBe(201);
    expect(r.data.order?.orderNumber).toBe(orderNum);
  });

  test('duplicate order number returns 409', async () => {
    const r = await api('POST', '/api/orders', {
      orderNumber: orderNum,
      buyerParty: 'BuyerCo',
      sellerParty: 'SellerCo',
      amount: 100,
    }, token);
    expect(r.status).toBe(409);
  });

  test('missing required fields returns 400', async () => {
    const r = await api('POST', '/api/orders', { orderNumber: `ORD-X-${suffix}` }, token);
    expect(r.status).toBe(400);
  });

  test('negative amount returns 400', async () => {
    const r = await api('POST', '/api/orders', {
      orderNumber: `ORD-NEG-${suffix}`,
      buyerParty: 'BuyerCo',
      sellerParty: 'SellerCo',
      amount: -50,
    }, token);
    expect(r.status).toBe(400);
  });

  test('zero amount returns 400', async () => {
    const r = await api('POST', '/api/orders', {
      orderNumber: `ORD-ZERO-${suffix}`,
      buyerParty: 'BuyerCo',
      sellerParty: 'SellerCo',
      amount: 0,
    }, token);
    expect(r.status).toBe(400);
  });

  test('deliveryDate before orderDate returns 400', async () => {
    const r = await api('POST', '/api/orders', {
      orderNumber: `ORD-DATE-${suffix}`,
      buyerParty: 'BuyerCo',
      sellerParty: 'SellerCo',
      amount: 100,
      orderDate: '2025-06-15',
      deliveryDate: '2025-06-01',
    }, token);
    expect(r.status).toBe(400);
    expect(r.data.error).toMatch(/deliveryDate cannot be before/i);
  });

  test('list orders returns created order', async () => {
    const r = await api('GET', '/api/orders', null, token);
    expect(r.status).toBe(200);
    const nums = r.data.orders.map((o) => o.orderNumber);
    expect(nums).toContain(orderNum);
  });

  test('get specific order', async () => {
    const r = await api('GET', `/api/orders/${orderNum}`, null, token);
    expect(r.status).toBe(200);
    expect(r.data.orderNumber).toBe(orderNum);
  });

  test('get non-existent order returns 404', async () => {
    const r = await api('GET', '/api/orders/DOES-NOT-EXIST', null, token);
    expect(r.status).toBe(404);
  });

  test('update order amount', async () => {
    const r = await api('PUT', `/api/orders/${orderNum}`, { amount: 500 }, token);
    expect(r.status).toBe(200);
    expect(r.data.order.amount).toBe(500);
  });

  test('update order with negative amount returns 400', async () => {
    const r = await api('PUT', `/api/orders/${orderNum}`, { amount: -1 }, token);
    expect(r.status).toBe(400);
  });

  test('update order with deliveryDate before orderDate returns 400', async () => {
    const r = await api('PUT', `/api/orders/${orderNum}`, {
      deliveryDate: '2020-01-01',
    }, token);
    expect(r.status).toBe(400);
  });

  test('delete order', async () => {
    const delNum = `ORD-DEL-${suffix}`;
    await api('POST', '/api/orders', {
      orderNumber: delNum, buyerParty: 'B', sellerParty: 'S', amount: 10,
    }, token);
    const r = await api('DELETE', `/api/orders/${delNum}`, null, token);
    expect(r.status).toBe(200);
  });

  test('unauthenticated request returns 401', async () => {
    const r = await api('GET', '/api/orders', null, null);
    expect(r.status).toBe(401);
  });
});

// ─── Guest Orders ─────────────────────────────────────────────────────────────
describe('Guest Orders', () => {
  const suffix = Date.now() + 1;

  test('create guest order returns XML without saving', async () => {
    const r = await api('POST', '/api/orders/guest/create', {
      orderNumber: `GUEST-${suffix}`,
      buyerParty: 'BuyerCo',
      sellerParty: 'SellerCo',
      amount: 150,
    });
    expect(r.status).toBe(200);
    expect(r.data.xmlDocument).toBeTruthy();
  });

  test('guest order with negative amount returns 400', async () => {
    const r = await api('POST', '/api/orders/guest/create', {
      orderNumber: `GUEST-NEG-${suffix}`,
      buyerParty: 'BuyerCo',
      sellerParty: 'SellerCo',
      amount: -100,
    });
    expect(r.status).toBe(400);
  });

  test('guest order with deliveryDate before orderDate returns 400', async () => {
    const r = await api('POST', '/api/orders/guest/create', {
      orderNumber: `GUEST-DATE-${suffix}`,
      buyerParty: 'BuyerCo',
      sellerParty: 'SellerCo',
      amount: 100,
      orderDate: '2025-06-15',
      deliveryDate: '2025-06-01',
    });
    expect(r.status).toBe(400);
  });

  test('guest order missing fields returns 400', async () => {
    const r = await api('POST', '/api/orders/guest/create', { orderNumber: 'X' });
    expect(r.status).toBe(400);
  });
});

// ─── Invoices ────────────────────────────────────────────────────────────────
describe('Invoices', () => {
  let token, invoiceId;
  const suffix = Date.now() + 2;

  beforeAll(async () => {
    token = await registerAndLogin(`inv-party-${suffix}`, 'pass123', 'DESPATCH_PARTY');
  });

  test('create invoice successfully', async () => {
    const r = await api('POST', '/api/invoices', {
      buyerParty: `buyer-${suffix}`,
      sellerParty: `seller-${suffix}`,
      totalAmount: 500,
      invoiceDate: '2025-06-01',
      dueDate: '2025-07-01',
    }, token);
    expect(r.status).toBe(201);
    invoiceId = r.data.id;
    expect(invoiceId).toBeTruthy();
  });

  test('create invoice with dueDate before invoiceDate returns 400', async () => {
    const r = await api('POST', '/api/invoices', {
      buyerParty: `buyer-${suffix}`,
      sellerParty: `seller-${suffix}`,
      totalAmount: 100,
      invoiceDate: '2025-07-01',
      dueDate: '2025-06-01',
    }, token);
    expect(r.status).toBe(400);
    expect(JSON.stringify(r.data)).toMatch(/dueDate cannot be before/i);
  });

  test('create invoice with negative totalAmount returns 400', async () => {
    const r = await api('POST', '/api/invoices', {
      buyerParty: `buyer-${suffix}`,
      sellerParty: `seller-${suffix}`,
      totalAmount: -100,
      invoiceDate: '2025-06-01',
    }, token);
    expect(r.status).toBe(400);
  });

  test('create invoice with zero totalAmount returns 400', async () => {
    const r = await api('POST', '/api/invoices', {
      buyerParty: `buyer-${suffix}`,
      sellerParty: `seller-${suffix}`,
      totalAmount: 0,
      invoiceDate: '2025-06-01',
    }, token);
    expect(r.status).toBe(400);
  });

  test('create invoice missing required fields returns 400', async () => {
    const r = await api('POST', '/api/invoices', { totalAmount: 100 }, token);
    expect(r.status).toBe(400);
  });

  test('get invoice by id', async () => {
    if (!invoiceId) return;
    const r = await api('GET', `/api/invoices/${invoiceId}`, null, token);
    expect(r.status).toBe(200);
    expect(r.data.id).toBe(invoiceId);
  });

  test('get non-existent invoice returns 404', async () => {
    const r = await api('GET', '/api/invoices/000000000000000000000000', null, token);
    expect(r.status).toBe(404);
  });

  test('patch invoice with negative amount returns 400', async () => {
    if (!invoiceId) return;
    const r = await api('PATCH', `/api/invoices/${invoiceId}`, { totalAmount: -50 }, token);
    expect(r.status).toBe(400);
  });

  test('patch invoice dueDate before invoiceDate returns 400', async () => {
    if (!invoiceId) return;
    const r = await api('PATCH', `/api/invoices/${invoiceId}`, { dueDate: '2020-01-01' }, token);
    expect(r.status).toBe(400);
  });

  test('delete invoice', async () => {
    if (!invoiceId) return;
    const r = await api('DELETE', `/api/invoices/${invoiceId}`, null, token);
    expect(r.status).toBe(200);
  });
});

// ─── Despatch Advices ─────────────────────────────────────────────────────────
describe('Despatch Advices', () => {
  let despatchToken, deliveryToken, adviceId;
  const suffix = Date.now() + 3;

  beforeAll(async () => {
    despatchToken = await registerAndLogin(`despatch-${suffix}`, 'pass123', 'DESPATCH_PARTY');
    deliveryToken = await registerAndLogin(`delivery-${suffix}`, 'pass123', 'DELIVERY_PARTY');
  });

  const validPayload = () => ({
    externalRef: `REF-${suffix}`,
    despatchParty: { partyId: `despatch-${suffix}`, name: 'Despatch Co' },
    deliveryParty: { partyId: `delivery-${suffix}`, name: 'Delivery Co' },
    dispatchDate: '2025-06-01',
    expectedDeliveryDate: '2025-06-10',
    items: [{ sku: 'SKU-001', description: 'Widget', quantity: 5, uom: 'EA' }],
  });

  test('create despatch advice successfully (returns XML)', async () => {
    // POST returns XML, so use raw fetch to read text
    const status = await page.evaluate(
      async ({ url, body, token }) => {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        });
        const text = await res.text();
        return { status: res.status, hasXml: text.includes('<?xml') || text.includes('DespatchAdvice') };
      },
      { url: `${BASE_URL}/api/despatch-advices`, body: validPayload(), token: despatchToken }
    );
    expect(status.status).toBe(201);
    expect(status.hasXml).toBe(true);
  });

  test('DELIVERY_PARTY cannot create despatch advice (403)', async () => {
    const r = await api('POST', '/api/despatch-advices', validPayload(), deliveryToken);
    expect(r.status).toBe(403);
  });

  test('expectedDeliveryDate before dispatchDate returns 400', async () => {
    const payload = validPayload();
    payload.externalRef = `REF-DATE-${suffix}`;
    payload.dispatchDate = '2025-06-10';
    payload.expectedDeliveryDate = '2025-06-01';
    const r = await api('POST', '/api/despatch-advices', payload, despatchToken);
    expect(r.status).toBe(400);
    expect(JSON.stringify(r.data)).toMatch(/expectedDeliveryDate cannot be before/i);
  });

  test('item quantity < 1 returns 422', async () => {
    const payload = validPayload();
    payload.externalRef = `REF-QTY-${suffix}`;
    payload.items = [{ sku: 'SKU-002', description: 'Bad', quantity: 0, uom: 'EA' }];
    const r = await api('POST', '/api/despatch-advices', payload, despatchToken);
    expect(r.status).toBe(422);
  });

  test('missing required fields returns 400', async () => {
    const r = await api('POST', '/api/despatch-advices', { externalRef: 'X' }, despatchToken);
    expect(r.status).toBe(400);
  });

  test('list despatch advices', async () => {
    const r = await api('GET', '/api/despatch-advices', null, despatchToken);
    expect(r.status).toBe(200);
    expect(Array.isArray(r.data.despatchAdvices)).toBe(true);
  });
});

// ─── Despatch Advice status patch ─────────────────────────────────────────────
describe('Despatch Advice status patch', () => {
  let despatchToken2, adviceId2;
  const suffix = Date.now() + 10;

  beforeAll(async () => {
    despatchToken2 = await registerAndLogin(`despatch2-${suffix}`, 'pass123', 'DESPATCH_PARTY');
    // Create a despatch advice (returns XML) to get an ID via list
    await page.evaluate(
      async ({ url, body, token }) => {
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        });
      },
      {
        url: `${BASE_URL}/api/despatch-advices`,
        body: {
          externalRef: `PATCH-REF-${suffix}`,
          despatchParty: { partyId: `despatch2-${suffix}`, name: 'D2' },
          deliveryParty: { partyId: `del2-${suffix}`, name: 'Del2' },
          dispatchDate: '2025-06-01',
          expectedDeliveryDate: '2025-06-15',
          items: [{ sku: 'P-SKU', description: 'Part', quantity: 2, uom: 'EA' }],
        },
        token: despatchToken2,
      }
    );
    const list = await api('GET', '/api/despatch-advices', null, despatchToken2);
    adviceId2 = list.data.despatchAdvices?.[0]?.dispatchAdviceId;
  });

  test('unauthenticated patch returns 401', async () => {
    if (!adviceId2) return;
    const r = await api('PATCH', `/api/despatch-advices/${adviceId2}/status`, { status: 'IN_TRANSIT' }, null);
    expect(r.status).toBe(401);
  });

  test('invalid status transition returns 409', async () => {
    if (!adviceId2) return;
    // SENT → CREATED is not a valid transition
    const r = await api('PATCH', `/api/despatch-advices/${adviceId2}/status`, { status: 'CREATED' }, despatchToken2);
    expect(r.status).toBe(409);
  });

  test('valid status transition SENT → IN_TRANSIT succeeds', async () => {
    if (!adviceId2) return;
    const r = await api('PATCH', `/api/despatch-advices/${adviceId2}/status`, { status: 'IN_TRANSIT' }, despatchToken2);
    expect(r.status).toBe(200);
  });
});

// ─── Fulfilment Cancellations ─────────────────────────────────────────────────
describe('Fulfilment Cancellations', () => {
  let despatchToken3, deliveryToken3, adviceId3;
  const suffix = Date.now() + 20;

  beforeAll(async () => {
    despatchToken3 = await registerAndLogin(`despatch3-${suffix}`, 'pass123', 'DESPATCH_PARTY');
    deliveryToken3 = await registerAndLogin(`delivery3-${suffix}`, 'pass123', 'DELIVERY_PARTY');

    // Create a despatch advice to cancel
    await page.evaluate(
      async ({ url, body, token }) => {
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        });
      },
      {
        url: `${BASE_URL}/api/despatch-advices`,
        body: {
          externalRef: `FC-REF-${suffix}`,
          despatchParty: { partyId: `despatch3-${suffix}`, name: 'D3' },
          deliveryParty: { partyId: `delivery3-${suffix}`, name: 'Del3' },
          dispatchDate: '2025-06-01',
          expectedDeliveryDate: '2025-06-15',
          items: [{ sku: 'FC-SKU', description: 'Widget', quantity: 3, uom: 'EA' }],
        },
        token: despatchToken3,
      }
    );
    const list = await api('GET', '/api/despatch-advices', null, despatchToken3);
    adviceId3 = list.data.despatchAdvices?.[0]?.dispatchAdviceId;
  });

  test('missing required fields returns 400', async () => {
    const r = await api('POST', '/api/fulfilment-cancellations', { dispatchAdviceId: 'X' }, despatchToken3);
    expect(r.status).toBe(400);
  });

  test('DELIVERY_PARTY cannot create cancellation (403)', async () => {
    if (!adviceId3) return;
    const r = await api('POST', '/api/fulfilment-cancellations', {
      dispatchAdviceId: adviceId3, reason: 'test',
    }, deliveryToken3);
    expect(r.status).toBe(403);
  });

  test('non-existent despatch advice returns 404', async () => {
    const r = await api('POST', '/api/fulfilment-cancellations', {
      dispatchAdviceId: 'DA-DOES-NOT-EXIST', reason: 'test',
    }, despatchToken3);
    expect(r.status).toBe(404);
  });

  test('cancel despatch advice successfully', async () => {
    if (!adviceId3) return;
    const r = await api('POST', '/api/fulfilment-cancellations', {
      dispatchAdviceId: adviceId3, reason: 'Wrong items',
    }, despatchToken3);
    expect(r.status).toBe(201);
  });

  test('cancelling an already-CANCELLED despatch returns 409', async () => {
    if (!adviceId3) return;
    const r = await api('POST', '/api/fulfilment-cancellations', {
      dispatchAdviceId: adviceId3, reason: 'Again',
    }, despatchToken3);
    expect(r.status).toBe(409);
  });
});

// ─── Receipt Advices ──────────────────────────────────────────────────────────
describe('Receipt Advices', () => {
  let despatchToken4, deliveryToken4, adviceId4;
  const suffix = Date.now() + 30;

  beforeAll(async () => {
    despatchToken4 = await registerAndLogin(`despatch4-${suffix}`, 'pass123', 'DESPATCH_PARTY');
    deliveryToken4 = await registerAndLogin(`delivery4-${suffix}`, 'pass123', 'DELIVERY_PARTY');

    await page.evaluate(
      async ({ url, body, token }) => {
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        });
      },
      {
        url: `${BASE_URL}/api/despatch-advices`,
        body: {
          externalRef: `RA-REF-${suffix}`,
          despatchParty: { partyId: `despatch4-${suffix}`, name: 'D4' },
          deliveryParty: { partyId: `delivery4-${suffix}`, name: 'Del4' },
          dispatchDate: '2025-06-01',
          expectedDeliveryDate: '2025-06-15',
          items: [{ sku: 'RA-SKU', description: 'Part', quantity: 10, uom: 'EA' }],
        },
        token: despatchToken4,
      }
    );
    const list = await api('GET', '/api/despatch-advices', null, despatchToken4);
    adviceId4 = list.data.despatchAdvices?.[0]?.dispatchAdviceId;
  });

  test('missing required fields returns 400', async () => {
    const r = await api('POST', '/api/receipt-advices', { dispatchAdviceId: 'X' }, deliveryToken4);
    expect(r.status).toBe(400);
  });

  test('receivedItems as non-array returns 400', async () => {
    const r = await api('POST', '/api/receipt-advices', {
      dispatchAdviceId: adviceId4,
      receiptDate: '2025-06-10',
      receivedItems: 'not-an-array',
    }, deliveryToken4);
    expect(r.status).toBe(400);
  });

  test('future receiptDate returns 400', async () => {
    if (!adviceId4) return;
    const r = await api('POST', '/api/receipt-advices', {
      dispatchAdviceId: adviceId4,
      receiptDate: '2099-01-01',
      receivedItems: [{ sku: 'RA-SKU', quantityReceived: 10, uom: 'EA' }],
    }, deliveryToken4);
    expect(r.status).toBe(400);
    expect(JSON.stringify(r.data)).toMatch(/future/i);
  });

  test('negative quantityReceived returns 422', async () => {
    if (!adviceId4) return;
    const r = await api('POST', '/api/receipt-advices', {
      dispatchAdviceId: adviceId4,
      receiptDate: '2025-06-10',
      receivedItems: [{ sku: 'RA-SKU', quantityReceived: -1, uom: 'EA' }],
    }, deliveryToken4);
    expect(r.status).toBe(422);
  });

  test('DESPATCH_PARTY cannot submit receipt (403)', async () => {
    if (!adviceId4) return;
    const r = await api('POST', '/api/receipt-advices', {
      dispatchAdviceId: adviceId4,
      receiptDate: '2025-06-10',
      receivedItems: [{ sku: 'RA-SKU', quantityReceived: 10, uom: 'EA' }],
    }, despatchToken4);
    expect(r.status).toBe(403);
  });

  test('non-existent despatch advice returns 404', async () => {
    const r = await api('POST', '/api/receipt-advices', {
      dispatchAdviceId: 'DA-DOES-NOT-EXIST',
      receiptDate: '2025-06-10',
      receivedItems: [{ sku: 'RA-SKU', quantityReceived: 10, uom: 'EA' }],
    }, deliveryToken4);
    expect(r.status).toBe(404);
  });
});

// ─── Order Adjustments ────────────────────────────────────────────────────────
describe('Order Adjustments', () => {
  let deliveryToken5;
  const suffix = Date.now() + 40;

  beforeAll(async () => {
    deliveryToken5 = await registerAndLogin(`delivery5-${suffix}`, 'pass123', 'DELIVERY_PARTY');
  });

  test('unauthenticated POST returns 401', async () => {
    const r = await api('POST', '/api/order-adjustments', {}, null);
    expect(r.status).toBe(401);
  });

  test('DESPATCH_PARTY cannot create adjustment (403)', async () => {
    const despToken = await registerAndLogin(`despatch5-${suffix}`, 'pass123', 'DESPATCH_PARTY');
    const r = await api('POST', '/api/order-adjustments', {}, despToken);
    expect(r.status).toBe(403);
  });

  test('list adjustments as DELIVERY_PARTY', async () => {
    const r = await api('GET', '/api/order-adjustments', null, deliveryToken5);
    expect(r.status).toBe(200);
  });
});

// ─── Additional Order Edge Cases ──────────────────────────────────────────────
describe('Order string-amount edge cases', () => {
  let token;
  const suffix = Date.now() + 50;

  beforeAll(async () => {
    token = await registerAndLogin(`edge-seller-${suffix}`, 'pass123', 'DESPATCH_PARTY');
  });

  test('string amount "-5" rejected (POST)', async () => {
    const r = await api('POST', '/api/orders', {
      orderNumber: `ORD-STR-NEG-${suffix}`,
      buyerParty: 'B', sellerParty: 'S', amount: '-5',
    }, token);
    expect(r.status).toBe(400);
  });

  test('string amount "100" accepted (POST)', async () => {
    const r = await api('POST', '/api/orders', {
      orderNumber: `ORD-STR-POS-${suffix}`,
      buyerParty: 'B', sellerParty: 'S', amount: '100',
    }, token);
    expect(r.status).toBe(201);
  });

  test('string amount "-1" rejected (PUT)', async () => {
    const r = await api('PUT', `/api/orders/ORD-STR-POS-${suffix}`, { amount: '-1' }, token);
    expect(r.status).toBe(400);
  });
});

// ─── Invoice missing totalAmount ──────────────────────────────────────────────
describe('Invoice totalAmount edge cases', () => {
  let token;
  const suffix = Date.now() + 60;

  beforeAll(async () => {
    token = await registerAndLogin(`inv-edge-${suffix}`, 'pass123', 'DESPATCH_PARTY');
  });

  test('absent totalAmount returns 400 (not saved as 0)', async () => {
    const r = await api('POST', '/api/invoices', {
      buyerParty: `b-${suffix}`,
      sellerParty: `s-${suffix}`,
      invoiceDate: '2025-06-01',
    }, token);
    expect(r.status).toBe(400);
  });
});

// ─── Health Check ─────────────────────────────────────────────────────────────
describe('Health', () => {
  test('GET /health returns ok', async () => {
    const r = await api('GET', '/health', null, null);
    expect(r.status).toBe(200);
  });
});

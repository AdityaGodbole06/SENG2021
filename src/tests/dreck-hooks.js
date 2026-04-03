const hooks = require('dreck/lib/hooks');

const TEST_TOKEN = 'SUP-01'; // Use party ID as token

hooks.beforeEach((transaction) => {
  // Inject Bearer token into all requests
  if (!transaction.request.headers) {
    transaction.request.headers = {};
  }
  transaction.request.headers.Authorization = `Bearer ${TEST_TOKEN}`;
});

hooks.afterEach((transaction) => {
  // Log transaction details for debugging
  console.log(`${transaction.request.method} ${transaction.request.uri} => ${transaction.response.status}`);
});

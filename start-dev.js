// Dev-only launcher: starts app with in-memory MongoDB
require('dotenv').config();
const { MongoMemoryServer } = require('mongodb-memory-server');

async function main() {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  console.log('MongoDB (in-memory) started at', mongod.getUri());

  require('./src/app');

  process.on('SIGINT', async () => {
    await mongod.stop();
    process.exit(0);
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

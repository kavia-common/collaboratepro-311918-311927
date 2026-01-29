const app = require('./app');
const config = require('./config');
const { bootstrapDatabase } = require('./db/bootstrap');

const HOST = config.host;
const PORT = config.port;

const server = app.listen(PORT, HOST, async () => {
  try {
    await bootstrapDatabase();
    console.log('Database bootstrap complete');
  } catch (err) {
    console.error('Database bootstrap failed:', err);
    // Exit fast if we cannot reach DB / create schema (unblocks troubleshooting)
    process.exit(1);
  }

  console.log(`Server running at http://${HOST}:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

module.exports = server;

require("dotenv").config();
const app = require("./app");
const { createServer } = require("http");
// const { setupWebSocket } = require('./src/websocket');
console.log("🚀 SERVER FILE IS RUNNING");

try {
  const prisma = require("./src/config/database");
  console.log("Prisma imported successfully");
} catch (err) {
  console.error("Prisma import failed:");
  console.error(err);
}

 const httpServer = createServer(app);

// const io = setupWebSocket(httpServer);

// Make io accessible
// app.set('io', io);

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║   🚀 RideFlow API Server Started    ║
  ║                                      ║
  ║   Environment: ${process.env.NODE_ENV?.padEnd(21)}║
  ║   Port: ${PORT.toString().padEnd(29)}║
  ║   URL: http://localhost:${PORT.toString().padEnd(12)}║
  ╚══════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, closing server...");
  await prisma.$disconnect();
  httpServer.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

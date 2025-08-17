import express from 'express';
import { memoryCache } from "@memory-cache-server/memory-cache";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Memory Cache Server API',
    version: '1.0.0',
    status: 'running'
  });
});

app.get('/api/cache', (req, res) => {
  const result = memoryCache();
  res.json({
    service: result,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 API server running on http://localhost:${PORT}`);
  console.log(`📚 Memory cache service: ${memoryCache()}`);
});

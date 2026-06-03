import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import notificationRoutes from './routes/notifications.js';
import usersRoutes from './routes/users.js';
import writeupsRoutes from './routes/writeups.js';
import modulesRoutes from './routes/modules.js';
import activityRoutes from './routes/activity.js';
import eventsRoutes from './routes/events.js';
import challengeRoutes from './routes/challenges.js';
import adminChallengeRoutes from './routes/adminChallenges.js';
import { initScheduler } from './utils/scheduler.js';
import { createProxyMiddleware } from 'http-proxy-middleware';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;

// ── Socket.io ─────────────────────────────────────────────────────────────────
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Make io available to route handlers via req.app.get('io')
app.set('io', io);

// Track total connected socket clients for the live player counter by deviceId
const connectedDevices = new Map();

io.on('connection', (socket) => {
  const deviceId = socket.handshake.query.deviceId || socket.id;

  // Add socket to the device's set
  if (!connectedDevices.has(deviceId)) {
    connectedDevices.set(deviceId, new Set());
  }
  connectedDevices.get(deviceId).add(socket.id);

  // Broadcast unique device count
  io.emit('players:count', connectedDevices.size);

  // Client joins its own activity room after authentication
  socket.on('activity:join', (userId) => {
    if (userId) {
      socket.join(`activity:${userId}`);
    }
  });

  socket.on('activity:leave', (userId) => {
    if (userId) {
      socket.leave(`activity:${userId}`);
    }
  });

  socket.on('disconnect', () => {
    const deviceSockets = connectedDevices.get(deviceId);
    if (deviceSockets) {
      deviceSockets.delete(socket.id);
      if (deviceSockets.size === 0) {
        connectedDevices.delete(deviceId);
      }
    }
    io.emit('players:count', connectedDevices.size);
  });
});

// Initialize the cron scheduler
initScheduler(io);

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

// Proxy middleware for embedding arbitrary HTTP challenges
app.use('/preview', createProxyMiddleware({
  target: 'http://placeholder.invalid', // Target is dynamically overridden
  router: (req) => {
    const match = req.originalUrl.match(/^\/preview\/([^/?]+)/);
    if (match) {
      try {
        const decodedUrl = Buffer.from(match[1], 'base64url').toString('utf-8');
        if (decodedUrl.startsWith('http://') || decodedUrl.startsWith('https://')) {
          const parsed = new URL(decodedUrl);
          return `${parsed.protocol}//${parsed.host}`;
        }
      } catch (err) {}
    }
    return null;
  },
  changeOrigin: true,
  pathRewrite: (path, req) => {
    // path here is req.url, which has '/preview' stripped by Express app.use()
    const match = path.match(/^\/([^/?]+)(.*)$/);
    if (match) {
      try {
        const decodedUrl = Buffer.from(match[1], 'base64url').toString('utf-8');
        if (decodedUrl.startsWith('http://') || decodedUrl.startsWith('https://')) {
          const parsed = new URL(decodedUrl);
          let rest = match[2] || '';
          
          if (rest === '' || rest === '/') {
            return parsed.pathname + parsed.search;
          }
          
          let relativePath = rest.startsWith('/') ? rest.slice(1) : rest;
          const targetUrl = new URL(relativePath, decodedUrl);
          return targetUrl.pathname + targetUrl.search;
        }
      } catch (err) {}
    }
    return path;
  },
  on: {
    proxyRes: (proxyRes, req, res) => {
      // Browsers block invalid X-Frame-Options values (like ALLOWALL). 
      // The only safe way to allow framing is to completely remove these headers.
      delete proxyRes.headers['x-frame-options'];
      delete proxyRes.headers['content-security-policy'];
      if (typeof res.removeHeader === 'function') {
        res.removeHeader('x-frame-options');
        res.removeHeader('content-security-policy');
      }

      // Automatically wrap redirects so they don't escape our proxy
      if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers['location']) {
        const location = proxyRes.headers['location'];
        if (location.startsWith('http://') || location.startsWith('https://')) {
          try {
            const newEncodedUrl = Buffer.from(location, 'utf-8').toString('base64url');
            proxyRes.headers['location'] = `/preview/${newEncodedUrl}/`;
            if (typeof res.setHeader === 'function') {
              res.setHeader('location', proxyRes.headers['location']);
            }
          } catch (e) {}
        }
      }
    },
  },
}));

app.use(express.json());
app.use(cookieParser());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/writeups', writeupsRoutes);
app.use('/api/modules', modulesRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/admin/challenges', adminChallengeRoutes);

// Basic health check
app.get('/', (req, res) => {
  res.json({ message: 'Spectre CTF API is running' });
});

// ── Database ──────────────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/spectre-ctf')
  .then(() => console.log('MongoDB Connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// ── Start ─────────────────────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT} (Socket.io enabled)`);
});

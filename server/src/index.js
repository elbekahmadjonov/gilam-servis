import 'dotenv/config';
import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { Server as SocketServer } from 'socket.io';

import { pool } from './db.js';
import { setIo } from './realtime.js';
import { verifyToken } from './auth.js';
import authRoutes from './routes/auth.js';
import orderRoutes from './routes/orders.js';
import templateRoutes from './routes/templates.js';
import xarajatRoutes from './routes/xarajatlar.js';
import superRoutes from './routes/super.js';
import deviceRoutes from './routes/devices.js';

const app = express();
const PORT = process.env.PORT || 3000;
// Bir nechta origin: vergul bilan ajratilgan ro'yxat ("*" bo'lsa hammasi)
const CORS_RAW = process.env.CORS_ORIGIN || '*';
const CORS_ORIGIN = CORS_RAW === '*' ? '*' : CORS_RAW.split(',').map((s) => s.trim());

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: '5mb' }));

// Sog'liq tekshiruvi
app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch {
    res.status(503).json({ ok: false, error: 'db ulanmadi' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/xarajatlar', xarajatRoutes);
app.use('/api/super', superRoutes);
app.use('/api/devices', deviceRoutes);

// 404
app.use('/api', (_req, res) => res.status(404).json({ error: 'Topilmadi' }));

// HTTP + Socket.io bitta serverda
const server = http.createServer(app);
const io = new SocketServer(server, {
  cors: { origin: CORS_ORIGIN },
  path: '/socket.io',
});

// Socket ulanishida tokenni tekshiramiz (ixtiyoriy, faqat avtorizatsiyalilar)
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('token yo\'q'));
  try {
    socket.user = verifyToken(token);
    next();
  } catch {
    next(new Error('token yaroqsiz'));
  }
});

io.on('connection', (socket) => {
  // Har tenant o'z room'ida — yangilanishlar faqat shu tenantga ketadi
  if (socket.user?.tenant_id) socket.join(String(socket.user.tenant_id));
  console.log('[socket] ulandi:', socket.user?.login || socket.id);
});

setIo(io);

server.listen(PORT, () => {
  console.log(`✅ Gilam server ${PORT}-portda ishlayapti`);
});

// Nozik yopilish
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    console.log(`\n${sig} — server yopilmoqda...`);
    server.close(() => pool.end().then(() => process.exit(0)));
  });
}

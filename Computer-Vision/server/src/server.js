import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './env.js';
import occupancyRouter from './routes/occupancy.js';

const app = express();

app.use(cors({ origin: (origin, cb) => {
  if (!origin) return cb(null, true);
  if (config.allowedOrigins.length === 0 || config.allowedOrigins.includes(origin)) return cb(null, true);
  return cb(new Error('Not allowed by CORS'));
}}));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/occupancy', occupancyRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(config.port, () => {
  console.log(`CV server listening on http://localhost:${config.port}`);
});

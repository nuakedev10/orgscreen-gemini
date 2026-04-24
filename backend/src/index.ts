import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db';
import organizationRoutes from './routes/organizationRoutes';
import jobRoutes from './routes/jobRoutes';
import candidateRoutes from './routes/candidateRoutes';
import screeningRoutes from './routes/screeningRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS: fully permissive. Fine for a hackathon demo since this API doesn't
// hold auth cookies or sessions. Tighten later by replacing origin:true with
// a specific list.
app.use(cors({
  origin: true,
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
// Explicitly handle preflight for every route so browsers never get a
// response without Access-Control-Allow-Origin.
app.options('*', cors({ origin: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

connectDB();

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OrgScreen backend is running',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (_req, res) => {
  res.json({ service: 'orgscreen-backend', health: '/api/health' });
});

app.use('/api/organizations', organizationRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/screening', screeningRoutes);

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((
  err: any,
  _req: express.Request,
  res: express.Response,
  _next: express.NextFunction
) => {
  console.error('[error]', err && err.message ? err.message : err);
  const status = err && err.status ? err.status : 500;
  res.status(status).json({
    error: (err && err.message) || 'Internal server error',
  });
});

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log('Server running on port ' + PORT);
});

export default app;

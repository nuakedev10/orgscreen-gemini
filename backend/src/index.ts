import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Database connection
connectDB();

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OrgScreen backend is running',
    timestamp: new Date().toISOString()
  });
});

// Routes will be added here as we build them

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
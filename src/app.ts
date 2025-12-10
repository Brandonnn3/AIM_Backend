import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Request, Response } from 'express';
import path from 'path';
import globalErrorHandler from './middlewares/globalErrorHandler';
import notFound from './middlewares/notFount';
import router from './routes';
import { Morgan } from './shared/morgen';
import i18next from './i18n/i18n';
import i18nextMiddleware from 'i18next-express-middleware';

import { s3Client } from './services/s3Service';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

const app = express();

// ---------------------------
// Logging
// ---------------------------
app.use(Morgan.successHandler);
app.use(Morgan.errorHandler);

// ---------------------------
// CORS
// ---------------------------
const allowedOrigins = new Set([
  'http://localhost:8084',
  'http://localhost:3000',
  'https://rakib7002.sobhoy.com',
  'https://aim-backend-82zx.onrender.com'
]);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.has(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
  })
);

// ---------------------------
// Parsers & cookies
// ---------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ---------------------------
// Static (uploads) — ALWAYS ENABLED
// ---------------------------
// 🔹 CHANGED: Removed the 'if (dev)' check so images load in all environments
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ---------------------------
// i18n
// ---------------------------
app.use(i18nextMiddleware.handle(i18next));

// ---------------------------
// Simple health & root routes
// ---------------------------
app.get('/healthz', (_req: Request, res: Response) => {
  res.status(200).send('ok');
});

app.get('/', (_req: Request, res: Response) => {
  res.status(200).send('AIM Backend up');
});

// =================================================================
// ✨ TEMPORARY DEBUGGING BLOCK
// =================================================================
app.use('/api/v1', (req, _res, next) => {
  if (req.method === 'PUT' || req.method === 'POST') {
    console.log(`[DEBUG] ${req.method} ${req.originalUrl}`);
    console.log('[DEBUG] Headers:', req.headers);
  }
  next();
});
// =================================================================

// ---------------------------
// API router
// ---------------------------
app.use('/api/v1', router);

// ---------------------------
// Dev-only MinIO/S3 proxy
// ---------------------------
if (process.env.NODE_ENV === 'development') {
  app.get('/uploads/:companyId/:projectId/:fileName', async (req: Request, res: Response) => {
    const { companyId, projectId, fileName } = req.params;
    const key = `${companyId}/${projectId}/${fileName}`;

    try {
      const command = new GetObjectCommand({
        Bucket: process.env.MINIO_BUCKET_NAME,
        Key: key,
      });

      const { Body } = await s3Client.send(command);

      if (Body instanceof Readable) {
        Body.pipe(res);
      } else {
        res.status(500).send('Error: File body is not a readable stream.');
      }
    } catch (error: any) {
      if (error?.name === 'NoSuchKey') {
        console.error(`File not found in MinIO: ${key}`);
        return res.status(404).send('File not found');
      }
      console.error('Error fetching file from MinIO:', error);
      res.status(500).send('Internal server error');
    }
  });
}

// ---------------------------
/* Test endpoints for i18n */
app.get('/test', (req: Request, res: Response) => {
  res.status(201).json({ message: req.t('welcome to the aim construction backend') });
});

app.get('/test/:lang', (req: Request, res: Response) => {
  const { lang } = req.params;
  i18next.changeLanguage(lang);
  console.log(`Current language: ${i18next.language}`);
  res.status(200).json({ message: req.t('welcome') });
});

// ---------------------------
// Error handlers
// ---------------------------
app.use(globalErrorHandler);
app.use(notFound);

export default app;
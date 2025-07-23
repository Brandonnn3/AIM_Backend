import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Request, Response } from 'express';
import path from 'path';
import globalErrorHandler from './middlewares/globalErrorHandler';
import notFound from './middlewares/notFount';
import router from './routes';
import { Morgan } from './shared/morgen';
import i18next from './i18n/i18n'; // Import the i18next configuration
import i18nextMiddleware from 'i18next-express-middleware';
import listEndpoints from 'express-list-endpoints'; // NEW: Add this import at the top

import { s3Client } from './services/s3Service'; // Import the client
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

const app = express();

// morgan
app.use(Morgan.successHandler);
app.use(Morgan.errorHandler);

// body parser
app.use(
  cors({
    origin: [
      'http://localhost:8084',
      'http://localhost:3000',
      'https://rakib7002.sobhoy.com/',
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Use cookie-parser to parse cookies
app.use(cookieParser());

// file retrieve
app.use('/uploads', express.static(path.join(__dirname, '../uploads/')));

// Use i18next middleware
app.use(i18nextMiddleware.handle(i18next));

// router
app.use('/api/v1', router);

// --- MinIO/S3 Local File Serving Endpoint (Development Only) ---
// This endpoint is for development only. It intercepts requests for uploaded files
// and streams them directly from the local MinIO server. This allows the
// Flutter app to display images without needing a separate file server.
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
                // Pipe the stream from MinIO to the response
                Body.pipe(res);
            } else {
                res.status(500).send('Error: File body is not a readable stream.');
            }
        } catch (error: any) {
            // A 404 from S3/MinIO often comes as a 'NoSuchKey' error.
            if (error.name === 'NoSuchKey') {
                console.error(`File not found in MinIO: ${key}`);
                return res.status(404).send('File not found');
            }
            console.error('Error fetching file from MinIO:', error);
            res.status(500).send('Internal server error');
        }
    });
}

// live response
app.get('/test', (req: Request, res: Response) => {
  res.status(201).json({ message: req.t('welcome to the aim construction backend') });
});

app.get('/test/:lang', (req: Request, res: Response) => {
  const { lang } = req.params;
  i18next.changeLanguage(lang);
  console.log(`Current language: ${i18next.language}`);
  res.status(200).json({ message: req.t('welcome') });
});

// global error handle
app.use(globalErrorHandler);

// handle not found route
app.use(notFound);


export default app;
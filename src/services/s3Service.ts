import 'dotenv/config';
import {
  S3Client,
  PutObjectCommand,
  S3ClientConfig,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import ApiError from '../errors/ApiError';
import { StatusCodes } from 'http-status-codes';

// --- FIX 1: Corrected the logic ---
// 'isProduction' is true only if NODE_ENV is 'production' AND S3_ENDPOINT is set
const isProduction =
  process.env.NODE_ENV === 'production' && !!process.env.S3_ENDPOINT;

const s3Config: S3ClientConfig = {};
let bucketName: string | undefined;
let publicUrlBase: string;

if (isProduction) {
  // --- Production (Backblaze B2) Configuration ---
  console.log('S3 Service: Using Backblaze B2.');

  const endpoint = process.env.S3_ENDPOINT!;
  // Extract region from endpoint, e.g., "s3.us-west-000.backblazeb2.com" -> "us-west-000"
  const region = endpoint.split('.')[1];

  s3Config.endpoint = `https://` + endpoint; // SDK needs the protocol
  s3Config.region = region;
  s3Config.credentials = {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  };
  bucketName = process.env.S3_BUCKET_NAME;
  publicUrlBase = `https://${endpoint}/${bucketName}`;
} else {
  // --- Local (MinIO) Configuration ---
  console.log('S3 Service: Using local MinIO server.');
  s3Config.endpoint = process.env.MINIO_ENDPOINT; // e.g., 'http://127.0.0.1:9000'
  s3Config.region = 'us-east-1'; // MinIO default
  s3Config.credentials = {
    accessKeyId: process.env.MINIO_ACCESS_KEY!,
    secretAccessKey: process.env.MINIO_SECRET_KEY!,
  };
  s3Config.forcePathStyle = true; // Required for MinIO
  bucketName = process.env.MINIO_BUCKET_NAME;
  publicUrlBase = `${process.env.MINIO_ENDPOINT}/${bucketName}`;
}

export const s3Client = new S3Client(s3Config);

interface UploadFileParams {
  fileBuffer: Buffer;
  companyId: string;
  projectId: string;
  originalname: string;
}

export const uploadFile = async ({
  fileBuffer,
  companyId,
  projectId,
  originalname,
}: UploadFileParams): Promise<string> => {
  const fileExtension = originalname.split('.').pop();
  const fileName = `${uuidv4()}.${fileExtension}`;
  const key = `${companyId}/${projectId}/${fileName}`;

  const params = {
    Bucket: bucketName,
    Key: key,
    Body: fileBuffer,
    ACL: 'public-read' as const,
  };

  try {
    await s3Client.send(new PutObjectCommand(params));

    // --- FIX 2: Return the correct public URL ---
    return `${publicUrlBase}/${key}`;
  } catch (error) {
    console.error('Error uploading file to S3/Backblaze:', error);
    throw error;
  }
};

export const deleteFile = async (fileUrl: string) => {
  if (!bucketName) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Bucket name is not configured.',
    );
  }
  try {
    // --- FIX 3: This logic is now robust for both URLs ---
    // Both URLs are "https://<...>/<bucketName>/<key>"
    // So splitting by "<bucketName>/" will get the key.
    const key = fileUrl.split(`${bucketName}/`)[1].split('?')[0];

    const params = {
      Bucket: bucketName,
      Key: key,
    };

    await s3Client.send(new DeleteObjectCommand(params));
    console.log(`Successfully deleted ${key} from ${bucketName}`);
    return { success: true };
  } catch (error) {
    console.error(`Failed to delete file from S3/Backblaze: ${fileUrl}`, error);
    // Don't throw an error that stops the whole process, just log it.
    return { success: false };
  }
};
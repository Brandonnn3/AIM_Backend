import 'dotenv/config';
import { S3Client, PutObjectCommand, S3ClientConfig, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import ApiError from '../errors/ApiError';
import { StatusCodes } from 'http-status-codes';

const isDevelopment = process.env.NODE_ENV === 'development';

const s3Config: S3ClientConfig = {
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: (isDevelopment ? process.env.MINIO_ACCESS_KEY : process.env.AWS_ACCESS_KEY_ID)!,
        secretAccessKey: (isDevelopment ? process.env.MINIO_SECRET_KEY : process.env.AWS_SECRET_ACCESS_KEY)!,
    },
};

if (isDevelopment) {
    s3Config.endpoint = process.env.MINIO_ENDPOINT;
    s3Config.forcePathStyle = true;
    console.log("S3 Service: Using local MinIO server.");
} else {
    console.log("S3 Service: Using AWS S3.");
}

export const s3Client = new S3Client(s3Config);
const bucketName = isDevelopment ? process.env.MINIO_BUCKET_NAME : process.env.AWS_S3_BUCKET_NAME;

interface UploadFileParams {
    fileBuffer: Buffer;
    companyId: string;
    projectId: string;
    originalname: string;
}

export const uploadFile = async ({ fileBuffer, companyId, projectId, originalname }: UploadFileParams): Promise<string> => {
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
        
        if (isDevelopment) {
            // --- FIX: Add a check and a default value for BASE_URL ---
            const baseUrl = process.env.BASE_URL;
            if (!baseUrl) {
                console.error("FATAL: BASE_URL environment variable is not set for development!");
                // Fallback to a default, but this should be fixed in the .env file.
                return `http://localhost:6731/uploads/${key}`;
            }
            return `${baseUrl}/uploads/${key}`;
        } else {
            return `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
        }
    } catch (error) {
        console.error("Error uploading file to S3/MinIO:", error);
        throw error;
    }
};

// --- FIX: Add the function to delete files from MinIO/S3 ---
export const deleteFile = async (fileUrl: string) => {
    if (!bucketName) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Bucket name is not configured.');
    }
    try {
        // Extract the object key from the full URL
        const key = fileUrl.split(`${bucketName}/`)[1].split('?')[0];
        
        const params = {
            Bucket: bucketName,
            Key: key,
        };
        
        await s3Client.send(new DeleteObjectCommand(params));
        console.log(`Successfully deleted ${key} from ${bucketName}`);
        return { success: true };
    } catch (error) {
        console.error(`Failed to delete file from S3/MinIO: ${fileUrl}`, error);
        // Don't throw an error that stops the whole process, just log it.
        return { success: false };
    }
};

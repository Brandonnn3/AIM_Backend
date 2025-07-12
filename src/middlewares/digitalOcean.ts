const {
  DeleteObjectCommand,
  ListObjectsV2Command,
  ObjectCannedACL,
  PutObjectCommand,
  CreateBucketCommand ,
  S3Client,
} = require("@aws-sdk/client-s3");
const { Readable } = require("stream");

const { Upload } = require("@aws-sdk/lib-storage");


// Initialize the S3 client with DigitalOcean Spaces config
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  //endpoint: `https://${process.env.AWS_REGION}.digitaloceanspaces.com`,
});


/////////// From Rakib Vai .. 
// Upload file to DigitalOcean Space
export const uploadFileToSpace = async (
  file: Express.Multer.File, // : Express.Multer.File
  folder : string // : string
) => {
  const fileName = `${folder}/${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
  const uploadParams = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fileName,
    Body: file.buffer, // file.stream
    //ACL: ObjectCannedACL.public_read, // 🔴🔴 // eta age chilo 
    ContentType: file.mimetype,
  };

  try {
    // Upload the file
    const command = new PutObjectCommand(uploadParams);
    await s3.send(command);

    // Use the CDN URL for better performance
    //const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.${process.env.AWS_REGION}.cdn.digitaloceanspaces.com/${fileName}`;
    
    const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

    return fileUrl;
  } catch (error) {
    console.error("Error uploading to DigitalOcean Space:", error);
    throw new Error("Failed to upload file to DigitalOcean Space");
  }
};


// Helper function to get the content length of a stream
const getStreamLength = (stream: any) => {
  return new Promise((resolve, reject) => {
    let length = 0;
    stream.on('data', (chunk: any) => {
      length += chunk.length;
    });
    stream.on('end', () => resolve(length));
    stream.on('error', reject);
  });
};

////////// Mohammad Sheakh
const uploadFileToSpaceMohammadSheakh = async (
  file: Express.Multer.File, // : Express.Multer.File
  folder : string // : string
) => {

  // Get the content length of the stream
  const contentLength = await getStreamLength(file.stream);


  const fileName = `${folder}/${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
  const uploadParams = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fileName,
    Body: Readable.from(file), // file.buffer, // file.stream
    // ACL: ObjectCannedACL.public_read,
    ContentType: file.mimetype,
    ContentLength: contentLength
  };

  try {
    // Upload the file
    const command = new PutObjectCommand(uploadParams);
    await s3.send(command);

    // Use the CDN URL for better performance
    const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.${process.env.AWS_REGION}.cdn.digitaloceanspaces.com/${fileName}`;
    return fileUrl;
  } catch (error) {
    console.error("Error uploading to DigitalOcean Space:", error);
    throw new Error("Failed to upload file to DigitalOcean Space");
  }
};


// Delete a specific file from DigitalOcean Space
export const deleteFileFromSpace = async (fileUrl : string) => {
  // : string  : Promise<void>
  /*
    const fileKey = fileUrl.split(
      `${process.env.AWS_BUCKET_NAME}.${process.env.AWS_REGION}.cdn.digitaloceanspaces.com/`
    )[1]; // Extract the file path from the CDN URL
  */


  const urlPrefix = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`;

    const fileKey = fileUrl.startsWith(urlPrefix)
    ? fileUrl.substring(urlPrefix.length)
    : fileUrl; // fallback if url format different

  const deleteParams = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fileKey,
  };

  try {
    const command = new DeleteObjectCommand(deleteParams);
    const result = await s3.send(command);
    console.log("command  🗑️result🚮" , command, result)
    console.log(`Successfully deleted ${fileKey} from DigitalOcean Space 🗑️🚮`);
  } catch (error) {
    console.error("Error deleting from DigitalOcean Space:", error);
    throw new Error("Failed to delete file from DigitalOcean Space");
  }
};
// test
// Delete all images from a specific folder in DigitalOcean Space
const deleteAllImagesFromSpace = async (folder = "") => {
  // : Promise<void>
  try {
    const listParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Prefix: folder, // Specify the folder prefix if provided
    };

    const listCommand = new ListObjectsV2Command(listParams);
    const response = await s3.send(listCommand);

    if (!response.Contents || response.Contents.length === 0) {
      console.log("No files found to delete.");
      return;
    }

    for (const item of response.Contents) {
      const deleteParams = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: item.Key,
      };

      const deleteCommand = new DeleteObjectCommand(deleteParams);
      await s3.send(deleteCommand);
      console.log(`Successfully deleted ${item.Key} from DigitalOcean Space`);
    }

    console.log("All images deleted successfully.");
  } catch (error) {
    console.error("Error deleting images from DigitalOcean Space:", error);
    throw new Error("Failed to delete images from DigitalOcean Space");
  }
};

module.exports = {
  uploadFileToSpace,
  uploadFileToSpaceMohammadSheakh,
  deleteFileFromSpace,
  deleteAllImagesFromSpace,
};

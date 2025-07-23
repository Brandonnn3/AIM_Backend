import { StatusCodes } from 'http-status-codes';
import ApiError from '../../errors/ApiError';
import { GenericService } from '../Generic Service/generic.services';
import { Attachment } from './attachment.model';
import { AttachmentType } from './attachment.constant';
import { TUser } from '../user/user.interface';
import { Note } from '../note/note.model'; // Import the Note model

// --- FIX: Import our centralized, MinIO-aware uploader ---
import { uploadFile, deleteFile } from '../../services/s3Service';

export class AttachmentService extends GenericService<typeof Attachment> {
  constructor() {
    super(Attachment);
  }

  // --- FIX: This method is updated to use our s3Service and link the attachment ---
  async uploadAndLinkAttachment(
    file: Express.Multer.File,
    projectId: string,
    noteId: string, // We now require the noteId to link the attachment
    user: TUser,
    attachedToType: string
  ) {
    // Step 1: Upload the file using our centralized service (handles MinIO vs AWS)
    const uploadedFileUrl = await uploadFile({
      fileBuffer: file.buffer,
      companyId: (user as any).companyId || 'aim-construction', // Using a placeholder as before
      projectId: projectId,
      originalname: file.originalname,
    });

    let fileType;
    if (file.mimetype.startsWith('image/')) {
      fileType = AttachmentType.image;
    } else {
      fileType = AttachmentType.document;
    }

    // Step 2: Create the attachment record in the database
    const newAttachment = await this.create({
      attachment: uploadedFileUrl,
      attachmentType: fileType,
      attachedToType: attachedToType,
      attachedToId: noteId, // Store the link to the note
      projectId: projectId,
      uploaderId: user._id, // Assuming user._id is the correct field
      uploaderRole: user.role,
    } as any);

    // Step 3: Add the new attachment's ID to the note's attachments array
    await Note.findByIdAndUpdate(noteId, {
      $push: { attachments: newAttachment._id },
    });

    return newAttachment;
  }

  // Your original deleteAttachment method (can be updated later to use s3Service)
  async deleteAttachment(fileUrl: string) {
    try {
      // Call the centralized deleteFile function from our s3Service
      await deleteFile(fileUrl);
    } catch (error) {
      console.error('Error during file deletion:', error);
      // We don't throw an error here to prevent the note deletion from failing
      // if the file is already gone.
    }
  }

  // Your original addOrRemoveReact method (unchanged)
  async addOrRemoveReact(attachmentId: string, userId: string) {
    const attachment = await this.getById(attachmentId);
    if (!attachment) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Attachment not found');
    }

    const reactionIndex = attachment.reactions.findIndex((reaction: any) => reaction.userId === userId);

    if (reactionIndex === -1) {
      attachment.reactions.push({ userId } as any);
    } else {
      attachment.reactions = attachment.reactions.filter(
        (reaction: any) => reaction.userId !== userId
      );
    }

    await attachment.save();
    return attachment;
  }
}

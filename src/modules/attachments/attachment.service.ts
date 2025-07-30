import { StatusCodes } from 'http-status-codes';
import ApiError from '../../errors/ApiError';
import { GenericService } from '../Generic Service/generic.services';
import { Attachment } from './attachment.model';
import { AttachmentType } from './attachment.constant';
import { TUser } from '../user/user.interface';
import { Note } from '../note/note.model';
import { uploadFile, deleteFile } from '../../services/s3Service';

export class AttachmentService extends GenericService<typeof Attachment> {
  constructor() {
    super(Attachment);
  }

  // ✨ NEW: The missing function to handle single file uploads like profile pictures.
  async uploadSingleAttachment(
    file: Express.Multer.File,
    folderName: string, // e.g., 'user'
    user: TUser,
    attachedToType: string
  ) {
    // For profile pictures, we don't have a projectId, so we can use the userId instead
    // to create a unique path.
    const pathId = (user._id as any).toString(); 

    const uploadedFileUrl = await uploadFile({
      fileBuffer: file.buffer,
      // We use a generic companyId or the user's companyId if available
      companyId: (user as any).companyId || 'aim-construction', 
      projectId: pathId, // Using userId for uniqueness
      originalname: file.originalname,
    });

    let fileType = file.mimetype.startsWith('image/')
      ? AttachmentType.image
      : AttachmentType.document;

    // Create the attachment record without linking to a project or note
    const newAttachment = await this.create({
      attachment: uploadedFileUrl,
      attachmentType: fileType,
      attachedToType: attachedToType,
      attachedToId: user._id, // The attachment is linked to the user themselves
      uploaderId: user._id,
      uploaderRole: user.role,
    } as any);

    return newAttachment;
  }

  async uploadAndCreateAttachment(
    file: Express.Multer.File,
    metadata: {
      projectId: string;
      user: TUser;
      attachedToType: string;
      customName?: string;
    }
  ) {
    const { projectId, user, attachedToType, customName } = metadata;

    const uploadedFileUrl = await uploadFile({
      fileBuffer: file.buffer,
      companyId: (user as any).companyId || 'aim-construction',
      projectId: projectId,
      originalname: file.originalname,
    });

    let fileType = file.mimetype.startsWith('image/')
      ? AttachmentType.image
      : AttachmentType.document;

    const newAttachment = await this.create({
      attachment: uploadedFileUrl,
      attachmentType: fileType,
      attachedToType: attachedToType,
      attachedToId: projectId,
      projectId: projectId,
      uploaderId: user._id,
      uploaderRole: user.role,
      customName: customName || file.originalname,
    } as any);

    return newAttachment;
  }

  async uploadAndLinkAttachment(
    file: Express.Multer.File,
    projectId: string,
    noteId: string,
    user: TUser,
    attachedToType: string
  ) {
    const uploadedFileUrl = await uploadFile({
      fileBuffer: file.buffer,
      companyId: (user as any).companyId || 'aim-construction',
      projectId: projectId,
      originalname: file.originalname,
    });

    let fileType;
    if (file.mimetype.startsWith('image/')) {
      fileType = AttachmentType.image;
    } else {
      fileType = AttachmentType.document;
    }

    const newAttachment = await this.create({
      attachment: uploadedFileUrl,
      attachmentType: fileType,
      attachedToType: attachedToType,
      attachedToId: noteId,
      projectId: projectId,
      uploaderId: user._id,
      uploaderRole: user.role,
    } as any);

    await Note.findByIdAndUpdate(noteId, {
      $push: { attachments: newAttachment._id },
    });

    return newAttachment;
  }

  async deleteAttachment(fileUrl: string) {
    try {
      await deleteFile(fileUrl);
    } catch (error) {
      console.error('Error during file deletion:', error);
    }
  }

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

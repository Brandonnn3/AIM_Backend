import { StatusCodes } from 'http-status-codes';
import ApiError from '../../errors/ApiError';
import { GenericService } from '../Generic Service/generic.services';
import { Attachment } from './attachment.model';
import {
  uploadFileToSpace,
  deleteFileFromSpace,
} from '../../middlewares/digitalOcean';
import { AttachmentType } from './attachment.constant';
import { TUser } from '../user/user.interface';

export class AttachmentService extends GenericService<typeof Attachment> {
  constructor() {
    super(Attachment);
  }

  async uploadSingleAttachment(
    file: Express.Multer.File,
    folderName: string,
    projectId: any,
    user: TUser,
    attachedToType: any
  ) {
    const uploadedFileUrl = await uploadFileToSpace(file, folderName);

    let fileType;
    if (file.mimetype.includes('image')) {
      fileType = AttachmentType.image;
    } else if (file.mimetype.includes('application')) {
      fileType = AttachmentType.document;
    }

    // FIX: Cast to 'any' to solve the property mismatch
    return await this.create({
      attachment: uploadedFileUrl,
      attachmentType: fileType,
      attachedToType: attachedToType,
      projectId: projectId ? projectId : null,
      uploadedByUserId: user._userId,
      uploaderRole: user.role,
    } as any);
  }

  async deleteAttachment(string: string) {
    try {
      await deleteFileFromSpace(string);
    } catch (error) {
      console.error('Error during file deletion:', error);
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Failed to delete image'
      );
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
      // FIX: Add explicit 'any' type to parameter
      attachment.reactions = attachment.reactions.filter(
        (reaction: any) => reaction.userId !== userId
      );
    }

    await attachment.save();
    return attachment;
  }
}
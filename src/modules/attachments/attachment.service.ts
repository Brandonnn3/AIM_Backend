import { StatusCodes } from 'http-status-codes';
import ApiError from '../../errors/ApiError';
import { GenericService } from '../Generic Service/generic.services';
import { Attachment } from './attachment.model';
import {
  uploadFileToSpace,
  deleteFileFromSpace,
} from '../../middlewares/digitalOcean';
import { AttachmentType } from './attachment.constant';

export class AttachmentService extends GenericService<typeof Attachment> {
  constructor() {
    super(Attachment);
  }

  async uploadSingleAttachment(
    file: Express.Multer.File,
    folderName: string,
    projectId: any,
    user: any,
    attachedToType: any
  ) {
    let uploadedFileUrl = await uploadFileToSpace(file, folderName);

    let fileType;
    if (file.mimetype.includes('image')) {
      fileType = AttachmentType.image;
    } else if (file.mimetype.includes('application')) {
      fileType = AttachmentType.document;
    }

    // ekhon amader ke ekta attachment create korte hobe ..
    return await this.create({
      attachment: uploadedFileUrl,
      attachmentType: fileType,
      // attachedToId : "",
      // attachedToType : "",
      attachedToType: attachedToType,
      projectId: projectId ? projectId : null,
      uploadedByUserId: user.userId,
      uploaderRole: user.role,
    });
  }

  // INFO :  If we want to upload multiple files .. we need to loop through all the files in
  // INFO : Controller and call the uploadSingleAttachment function for each file.

  async deleteAttachment(string: string) {
    try {
      await deleteFileFromSpace(string);
    } catch (error) {
      // Error handling for file deletion or DB deletion failure
      console.error('Error during file deletion:', error);
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Failed to delete image'
      );
      // TODO : Give user a hint that what image he is trying to delete ..
      // FIXME
    }
  }

  async addOrRemoveReact(attachmentId: string, userId: string) {
    const attachment = await this.getById(attachmentId);
    if (!attachment) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Attachment not found');
    }

    const reaction = await attachment.reactions.find({ userId });

    if (!reaction) {
      attachment.reactions.push({ userId });
    } else {
      attachment.reactions = attachment.reactions.filter(
        reaction => reaction.userId !== userId
      );
    }

    // const index = attachment.reactions.indexOf(userId);
    // if (index === -1) {
    //   attachment.reactions.push(userId);
    // } else {
    //   attachment.reactions.splice(index, 1);
    // }

    await attachment.save();
    return attachment;
  }
}

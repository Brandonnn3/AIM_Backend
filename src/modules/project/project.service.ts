import mongoose from 'mongoose';
import { GenericService } from '../Generic Service/generic.services';
import { Project } from './project.model';
import ApiError from '../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import { Attachment } from '../attachments/attachment.model';

export class ProjectService extends GenericService<typeof Project> {
  constructor() {
    super(Project);
  }

  // project must be softDeleted // its already implemented in Generic Service ..

  async getAllimagesOrDocumentOFnoteOrTaskByProjectId(
    projectId: string,
    noteOrTaskOrProject: string,
    imageOrDocument: string,
    uploaderRole: string
  ) {
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Invalid projectId');
    }

    //🟢 Query Notes with exact date match for the given projectId and date range
    const attachments = await Attachment.find({
      attachedToType: { $in: ['note', 'task', 'project'] }, // 'note'
      projectId: projectId,
      attachmentType: imageOrDocument, // 'image'
      uploaderRole: uploaderRole,
    })
      .select(
        '-projectId -updatedAt -__v -attachedToId -note -_attachmentId -attachmentType'
      )
      .exec();

    // TODO :  query aro optimize korar try korte hobe

    // Helper function to extract the date portion (YYYY-MM-DD)
    //  const extractDate = (date) => {
    //   return new Date(date).toISOString().split('T')[0]; // Extract YYYY-MM-DD
    // };

    // Helper function to format date as "Sunday, February 23, 2025"
    const formatDate = (date: any) => {
      const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      };
      return new Date(date).toLocaleDateString('en-US', options);
    };
    // Group attachments by date
    const groupedByDate = attachments.reduce((acc: any, attachment) => {
      // const dateKey = extractDate(attachment.createdAt); // Extract YYYY-MM-DD
      const dateKey = formatDate(attachment.createdAt);
      if (!acc[dateKey]) {
        acc[dateKey] = []; // Initialize array for the date
      }
      acc[dateKey].push(attachment); // Add the attachment to the corresponding date
      return acc;
    }, {});

    // Transform into the desired output format
    const result = Object.keys(groupedByDate).map(date => ({
      date: date,
      attachments: groupedByDate[date],
    }));

    return result;
  }
}

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

  async getAllProjectsByManagerId(managerId: string) {
    if (!mongoose.Types.ObjectId.isValid(managerId)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid manager ID');
    }
    const projects = await this.model
      .find({ projectManagerId: managerId })
      .populate('projectSuperVisorId', 'fname lname email profileImage');
    return projects;
  }

  async getAllimagesOrDocumentOFnoteOrTaskByProjectId(
    projectId: string,
    noteOrTaskOrProject: string,
    imageOrDocument: string,
    uploaderRole: string
  ) {
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Invalid projectId');
    }
    const attachments = await Attachment.find({
      attachedToType: { $in: ['note', 'task', 'project'] },
      projectId: projectId,
      attachmentType: imageOrDocument,
      uploaderRole: uploaderRole,
    })
      .select(
        '-projectId -updatedAt -__v -attachedToId -note -_attachmentId -attachmentType'
      )
      .exec();

    const formatDate = (date: any) => {
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      };
      return new Date(date).toLocaleDateString('en-US', options);
    };

    const groupedByDate = attachments.reduce((acc: any, attachment) => {
      const dateKey = formatDate(attachment.createdAt);
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(attachment);
      return acc;
    }, {});

    const result = Object.keys(groupedByDate).map(date => ({
      date: date,
      attachments: groupedByDate[date],
    }));

    return result;
  }
}
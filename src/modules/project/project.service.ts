import mongoose from 'mongoose';
import { GenericService } from '../Generic Service/generic.services';
import { Project } from './project.model';
import ApiError from '../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import { Attachment } from '../attachments/attachment.model';
import { Note } from '../note/note.model';
import { Task } from '../task/task.model';

export class ProjectService extends GenericService<typeof Project> {
  constructor() {
    super(Project);
  }

  async updateById(id: string, payload: any): Promise<any> {
    return super.updateById(id, payload);
  }

  async getAllProjectsByManagerId(managerId: string) {
    if (!mongoose.Types.ObjectId.isValid(managerId)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid manager ID');
    }

    const projects = await this.model.aggregate([
      { $match: { projectManagerId: new mongoose.Types.ObjectId(managerId), isDeleted: false } },
      {
        $lookup: {
          from: 'tasks', // The name of the tasks collection in MongoDB
          let: { projectId: '$_id' },
          pipeline: [
            { 
              $match: { 
                $expr: { $eq: ['$projectId', '$$projectId'] },
                task_status: 'open' // Only count tasks with 'open' status
              } 
            },
            { $count: 'total' }
          ],
          as: 'openTasks'
        }
      },
      {
        $addFields: {
          openTasksCount: { $ifNull: [{ $arrayElemAt: ['$openTasks.total', 0] }, 0] }
        }
      },
      { $project: { openTasks: 0 } } // Clean up the temporary field
    ]);

    // We need to populate supervisor details separately after aggregation
    await Project.populate(projects, { path: 'projectSuperVisorIds', select: 'fname lname email profileImage' });
    
    return projects;
  }

  async getAllProjectsBySupervisorId(supervisorId: string) {
    if (!mongoose.Types.ObjectId.isValid(supervisorId)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid supervisor ID');
    }
    
    const projects = await this.model.aggregate([
      { 
        $match: { 
          projectSuperVisorIds: new mongoose.Types.ObjectId(supervisorId), 
          isDeleted: false 
        } 
      },
      {
        $lookup: {
          from: 'tasks',
          let: { projectId: '$_id' },
          pipeline: [
            { 
              $match: { 
                $expr: { $eq: ['$projectId', '$$projectId'] },
                task_status: 'open'
              } 
            },
            { $count: 'total' }
          ],
          as: 'openTasks'
        }
      },
      {
        $addFields: {
          openTasksCount: { $ifNull: [{ $arrayElemAt: ['$openTasks.total', 0] }, 0] }
        }
      },
      { $project: { openTasks: 0 } }
    ]);

    await Project.populate(projects, { path: 'projectSuperVisorIds', select: 'fname lname email profileImage' });

    return projects;
  }

  async getProjectActivityDates(projectId: string): Promise<string[]> {
    const notesWithDates = await Note.find({ projectId }).distinct('createdAt');
    const attachmentsWithDates = await Attachment.find({ projectId }).distinct('createdAt');

    const allDates = [...notesWithDates, ...attachmentsWithDates] as Date[];
    
    const uniqueDateStrings = [...new Set(allDates.map(date => date.toISOString().split('T')[0]))];
    
    return uniqueDateStrings;
  }

  async getAllimagesOrDocumentOFnoteOrTaskByProjectId(
    projectId: string,
    noteOrTaskOrProject: string,
    imageOrDocument: string,
    date?: string
  ) {
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Invalid projectId');
    }

    const query: any = {
      attachedToType: { $in: ['note', 'task', 'project'] },
      projectId: projectId,
      attachmentType: imageOrDocument,
    };

    if (date) {
      const startDate = new Date(date);
      startDate.setUTCHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setUTCHours(23, 59, 59, 999);
      query.createdAt = { $gte: startDate, $lte: endDate };
    }

    const attachments = await Attachment.find(query)
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

  async findProjectsNearingDeadline() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(today.getDate() + 7);
    sevenDaysFromNow.setHours(23, 59, 59, 999);

    const projects = await this.model.find({
      isDeleted: false,
      endDate: {
        $gte: today,
        $lte: sevenDaysFromNow,
      },
    }).select('projectName endDate projectManagerId');

    return projects;
  }
}

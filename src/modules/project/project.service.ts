import mongoose, { Types } from 'mongoose';
import { GenericService } from '../Generic Service/generic.services';
import { Project } from './project.model';
import ApiError from '../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import { Attachment } from '../attachments/attachment.model';
import { Note } from '../note/note.model';
import { Task } from '../task/task.model';
import { IProject } from './project.interface';

// Define an interface for the lean project document to fix TS7006 errors.
// This matches the shape of the plain JavaScript objects returned by the .lean() query.
interface IProjectLean extends Omit<IProject, '_id' | 'projectSuperVisorIds'> {
  _id: Types.ObjectId;
  projectSuperVisorIds: Types.ObjectId[];
}

export class ProjectService extends GenericService<typeof Project> {
  constructor() {
    super(Project);
  }

  async updateById(id: string, payload: any): Promise<any> {
    return super.updateById(id, payload);
  }

  /**
   * Retrieves all projects for a given project manager, including a count of open tasks.
   * This method uses multiple queries to bypass DocumentDB's advanced $lookup limitations.
   * @param managerId The ID of the project manager.
   * @returns An array of projects with an added openTasksCount property.
   */
  async getAllProjectsByManagerId(managerId: string) {
    if (!mongoose.Types.ObjectId.isValid(managerId)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid manager ID');
    }

    // --- STEP 1: Fetch Projects first as lean objects ---
    // The .lean() method returns plain JavaScript objects, which are faster to process
    // and can be manually manipulated before passing them back to Mongoose for population.
    const projects = await this.model.find({ 
      projectManagerId: new mongoose.Types.ObjectId(managerId), 
      isDeleted: false 
    }).lean();

    // Get all the project IDs from the fetched projects
    const projectIds = projects.map((p: IProjectLean) => p._id);

    // --- STEP 2: Get open task counts for all projects in a single aggregation query ---
    const openTaskCounts = await Task.aggregate([
      {
        $match: {
          projectId: { $in: projectIds }, // Match tasks for the fetched projects
          task_status: 'open',
        },
      },
      {
        $group: {
          _id: '$projectId', // Group by projectId
          count: { $sum: 1 }, // Count open tasks per project
        },
      },
    ]);

    // Convert the aggregation result into a map for quick lookups
    const openTaskMap = new Map<string, number>(openTaskCounts.map(item => [item._id.toString(), item.count]));

    // --- STEP 3: Manually merge the open task counts into each project object ---
    const projectsWithCounts = projects.map((project: IProjectLean) => {
        const count = openTaskMap.get(project._id.toString()) || 0;
        return {
            ...project,
            openTasksCount: count,
        };
    });

    // Populate supervisor details using the merged projects array
    await Project.populate(projectsWithCounts, { 
      path: 'projectSuperVisorIds', 
      select: 'fname lname email profileImage' 
    });
    
    return projectsWithCounts;
  }

  /**
   * Retrieves all projects for a given supervisor, including a count of open tasks.
   * This method uses the same multi-query pattern to ensure DocumentDB compatibility.
   * @param supervisorId The ID of the supervisor.
   * @returns An array of projects with an added openTasksCount property.
   */
  async getAllProjectsBySupervisorId(supervisorId: string) {
    if (!mongoose.Types.ObjectId.isValid(supervisorId)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid supervisor ID');
    }
    
    // --- STEP 1: Fetch Projects first as lean objects ---
    const projects = await this.model.find({ 
      projectSuperVisorIds: new mongoose.Types.ObjectId(supervisorId), 
      isDeleted: false 
    }).lean();

    const projectIds = projects.map((p: IProjectLean) => p._id);

    // --- STEP 2: Get open task counts for all projects in a single aggregation query ---
    const openTaskCounts = await Task.aggregate([
      {
        $match: {
          projectId: { $in: projectIds },
          task_status: 'open',
        },
      },
      {
        $group: {
          _id: '$projectId',
          count: { $sum: 1 },
        },
      },
    ]);

    const openTaskMap = new Map<string, number>(openTaskCounts.map(item => [item._id.toString(), item.count]));

    // --- STEP 3: Manually merge the open task counts into each project object ---
    const projectsWithCounts = projects.map((project: IProjectLean) => {
        const count = openTaskMap.get(project._id.toString()) || 0;
        return {
            ...project,
            openTasksCount: count,
        };
    });

    await Project.populate(projectsWithCounts, { 
      path: 'projectSuperVisorIds', 
      select: 'fname lname email profileImage' 
    });

    return projectsWithCounts;
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

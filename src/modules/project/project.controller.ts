import { Request, Response, RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import { io } from '../../server';
import { AttachedToType, UploaderRole } from '../attachments/attachment.constant';
import { AttachmentService } from '../attachments/attachment.service';
import ApiError from '../../errors/ApiError';
import { INotification } from '../notification/notification.interface';
import { NotificationService } from '../notification/notification.services';
import catchAsync from '../../shared/catchAsync';
import sendResponse from '../../shared/sendResponse';
import { TUser } from '../user/user.interface';
import { ProjectService } from './project.service';
import { User } from '../user/user.model';
import { Types } from 'mongoose';
import { Project } from '../project/project.model'; // Import Project model

const projectService = new ProjectService();
const attachmentService = new AttachmentService();

const createProject: RequestHandler = catchAsync(async (req, res) => {
  const user = req.user as TUser;
  req.body.projectManagerId = user._id;
  req.body.projectStatus = 'planning';

  if (req.body.projectSuperVisorId === '' || !req.body.projectSuperVisorId) {
    delete req.body.projectSuperVisorId;
  }

  const result = await projectService.create(req.body);

  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  if (files && files.projectLogo && files.projectLogo.length > 0) {
    const file = files.projectLogo[0];
    
    const newAttachment = await attachmentService.uploadAndCreateAttachment(
      file,
      {
        projectId: result._id.toString(),
        user,
        attachedToType: AttachedToType.project,
      }
    );
    
    await projectService.updateById(result._id.toString(), { projectLogo: newAttachment.attachment });
  }

  // --- NOTIFICATION LOGIC ---

  // 1. If a supervisor is assigned, create two notifications
  if (result && result.projectSuperVisorId) {
    const supervisor = await User.findById(result.projectSuperVisorId).select('fname lname');
    const supervisorName = supervisor ? `${supervisor.fname} ${supervisor.lname}` : 'A supervisor';

    // a) A direct notification TO the supervisor
    const supervisorNotification: INotification = {
      title: `You have been assigned to project: '${result.projectName}'`,
      receiverId: result.projectSuperVisorId,
      role: UploaderRole.projectSupervisor,
      notificationFor: 'assign',
      projectId: result._id,
      linkId: result._id,
      isDeleted: false,
    };
    const notification = await NotificationService.addNotification(supervisorNotification);
    if (io) {
      io.to(result.projectSuperVisorId.toString()).emit('newNotification', {
        code: StatusCodes.OK,
        message: 'New notification',
        data: notification,
      });
    }

    // b) An activity feed item FOR the manager
    const managerAssignmentActivity: INotification = {
        title: `Supervisor Assigned: ${supervisorName} was assigned to '${result.projectName}'.`,
        receiverId: result.projectManagerId,
        role: UploaderRole.projectManager,
        notificationFor: 'assign',
        projectId: result._id,
        linkId: result._id,
        isDeleted: false
    };
    await NotificationService.addNotification(managerAssignmentActivity);
  }

  // 2. Create the "New Project Created" activity for the manager's feed
  const creatorName = user.fname ? `${user.fname} ${user.lname}` : 'A manager';
  const creatorActivity: INotification = {
    title: `New Project Created: ${creatorName} created the project '${result.projectName}'.`,
    receiverId: result.projectManagerId,
    notificationFor: 'project',
    projectId: result._id,
    linkId: result._id,
    role: 'projectManager' as any,
    isDeleted: false,
  };
  await NotificationService.addNotification(creatorActivity);

  const updatedProject = await projectService.getById(result._id.toString());

  sendResponse(res, {
    code: StatusCodes.OK,
    data: updatedProject,
    message: 'Project created successfully',
    success: true,
  });
});

const updateById: RequestHandler = catchAsync(async (req, res) => {
    const user = req.user as TUser;
    const result = await projectService.updateById(req.params.projectId, req.body);

    if (result && result.projectManagerId) {
      const updaterName = user.fname ? `${user.fname} ${user.lname}` : 'A manager';
      const notificationPayload: INotification = {
        title: `Project Updated: Details for '${result.projectName}' were updated by ${updaterName}.`,
        receiverId: result.projectManagerId,
        notificationFor: 'project',
        projectId: result._id as Types.ObjectId,
        linkId: result._id,
        role: 'projectManager' as any,
        isDeleted: false,
      };
      await NotificationService.addNotification(notificationPayload);
    }

    sendResponse(res, { code: StatusCodes.OK, data: result, message: 'Project updated successfully', success: true });
});

const uploadProjectDocument: RequestHandler = catchAsync(async (req, res) => {
  const user = req.user as TUser;
  const { projectId, customName } = req.body;

  if (!req.files || !('attachments' in req.files) || req.files.attachments.length === 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'No document file provided.');
  }

  const file = (req.files as { attachments: Express.Multer.File[] }).attachments[0];

  const newAttachment = await attachmentService.uploadAndCreateAttachment(
    file,
    {
      projectId: projectId,
      user,
      attachedToType: AttachedToType.project,
      customName: customName
    }
  );

  // ✨ ADD THIS BLOCK TO CREATE AN ACTIVITY RECORD ✨
  const project = await Project.findById(projectId).select('projectName projectManagerId');
  if (project && project.projectManagerId) {
    const uploaderName = user.fname ? `${user.fname} ${user.lname}` : 'A user';
    const documentName = customName || file.originalname;
    const notificationPayload: INotification = {
      title: `Document Uploaded: ${uploaderName} uploaded '${documentName}' to '${project.projectName}'.`,
      receiverId: project.projectManagerId,
      notificationFor: 'attachment',
      projectId: project._id as Types.ObjectId,
      linkId: newAttachment._id, // Link to the new attachment
      role: 'projectManager' as any,
      isDeleted: false,
    };
    await NotificationService.addNotification(notificationPayload);
  }
  // ✨ END OF BLOCK ✨

  sendResponse(res, {
    code: StatusCodes.OK,
    data: newAttachment,
    message: 'Attachment created and linked successfully',
    success: true,
  });
});


// --- NO CHANGES TO OTHER FUNCTIONS ---

const getProjectActivityDates: RequestHandler = catchAsync(async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const result = await projectService.getProjectActivityDates(projectId);
  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'Activity dates retrieved successfully',
    success: true,
  });
});

const getAProject: RequestHandler = catchAsync(async (req, res) => {
    const result = await projectService.getById(req.params.projectId);
    sendResponse(res, { code: StatusCodes.OK, data: result, message: 'Project retrieved successfully', success: true });
});

const getAllProject: RequestHandler = catchAsync(async (req, res) => {
    const result = await projectService.getAll();
    sendResponse(res, { code: StatusCodes.OK, data: result, message: 'All projects', success: true });
});

const getAllProjectsByManager: RequestHandler = catchAsync(async (req, res) => {
  const user = req.user as TUser;
  if (!user || !user._id) { throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not found or invalid token'); }
  const result = await projectService.getAllProjectsByManagerId(user._id);
  sendResponse(res, { code: StatusCodes.OK, data: result, message: 'Manager projects retrieved successfully', success: true });
});

const getAllProjectWithPagination: RequestHandler = catchAsync(async (req, res) => {
  const user = req.user as any;
  if (!user || !user._id) { throw new ApiError(StatusCodes.UNAUTHORIZED, 'User information is missing'); }
  const result = await projectService.getAllProjectsByManagerId(user._id.toString());
  sendResponse(res, { code: StatusCodes.OK, data: result, message: 'Manager projects retrieved successfully', success: true });
});

const softDeleteById: RequestHandler = catchAsync(async (req, res) => {
    const result = await projectService.softDeleteById(req.params.projectId);
    sendResponse(res, { code: StatusCodes.OK, data: result, message: 'Project deleted successfully', success: true });
});

const getAllimagesOrDocumentOFnoteOrTaskOrProjectByProjectId: RequestHandler = catchAsync(
    async (req, res) => {
        const { projectId, noteOrTaskOrProject, imageOrDocument } = req.query;
        let result;
        if (projectId) {
            result = await projectService.getAllimagesOrDocumentOFnoteOrTaskByProjectId(
                projectId as string,
                noteOrTaskOrProject as string,
                imageOrDocument as string
            );
        }
        sendResponse(res, { code: StatusCodes.OK, data: result, message: 'All images/documents by project id', success: true });
    }
);

export const ProjectController = {
    createProject,
    getAProject,
    getAllProject,
    getAllProjectsByManager,
    getAllProjectWithPagination,
    updateById,
    softDeleteById,
    getAllimagesOrDocumentOFnoteOrTaskOrProjectByProjectId,
    uploadProjectDocument,
    getProjectActivityDates, 
};

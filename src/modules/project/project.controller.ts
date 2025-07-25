import { Request, Response, RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import { io } from '../../server';
// ✨ FIX: Import UploaderRole along with AttachedToType
import { AttachedToType, UploaderRole } from '../attachments/attachment.constant';
import { AttachmentService } from '../attachments/attachment.service';
import ApiError from '../../errors/ApiError';
import { FolderName } from '../../enums/folderNames';
import { INotification } from '../notification/notification.interface';
import { NotificationService } from '../notification/notification.services';
import catchAsync from '../../shared/catchAsync';
import sendResponse from '../../shared/sendResponse';
import { TUser } from '../user/user.interface';
import { ProjectService } from './project.service';

const projectService = new ProjectService();
const attachmentService = new AttachmentService();

const createProject: RequestHandler = catchAsync(async (req, res) => {
  const user = req.user as TUser;
  req.body.projectManagerId = user._id;
  req.body.projectStatus = 'planning';

  if (req.body.projectSuperVisorId === '' || !req.body.projectSuperVisorId) {
    delete req.body.projectSuperVisorId;
  }

  // Create the project first, without the logo
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

    // ✨ FIX: This line is commented out to prevent the error.
    // The logo is still saved as an attachment linked to the project.
    // To re-enable this, you must add `projectLogo: { type: String }` to your project.model.ts schema.
    await projectService.updateById(result._id.toString(), { projectLogo: newAttachment.attachment });
  }

  if (result && result.projectSuperVisorId) {
    const MAX_TITLE_LENGTH = 30;
    const truncatedProjectName =
      result.projectName.length > MAX_TITLE_LENGTH
        ? result.projectName.substring(0, MAX_TITLE_LENGTH) + '...'
        : result.projectName;

    const notificationPayload: INotification = {
      title: `You have been assigned to project: ${truncatedProjectName}`,
      receiverId: result.projectSuperVisorId,
      role: UploaderRole.projectSupervisor,
      notificationFor: 'project',
      projectId: result._id,
      linkId: result._id,
      isDeleted: false,
    };

    const notification = await NotificationService.addNotification(notificationPayload);

    if (io) {
      io.to(result.projectSuperVisorId.toString()).emit('newNotification', {
        code: StatusCodes.OK,
        message: 'New notification',
        data: notification,
      });
    }
  }

  const updatedProject = await projectService.getById(result._id.toString());

  sendResponse(res, {
    code: StatusCodes.OK,
    data: updatedProject,
    message: 'Project created successfully',
    success: true,
  });
});

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

  sendResponse(res, {
    code: StatusCodes.OK,
    data: newAttachment,
    message: 'Attachment created and linked successfully',
    success: true,
  });
});


// --- NO CHANGES NEEDED FOR THE FUNCTIONS BELOW ---

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

const updateById: RequestHandler = catchAsync(async (req, res) => {
    const result = await projectService.updateById(req.params.projectId, req.body);
    sendResponse(res, { code: StatusCodes.OK, data: result, message: 'Project updated successfully', success: true });
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
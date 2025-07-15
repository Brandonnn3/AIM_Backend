import { RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import { io } from '../../server';
import { AttachedToType, UploaderRole } from '../attachments/attachment.constant';
import { AttachmentService } from '../attachments/attachment.service';
import ApiError from '../../errors/ApiError';
import { FolderName } from '../../enums/folderNames';
import { INotification } from '../notification/notification.interface';
import { NotificationService } from '../notification/notification.services';
import catchAsync from '../../shared/catchAsync';
import pick from '../../shared/pick';
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

  let attachments: string[] = [];
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  if (files && files.projectLogo) {
    attachments = await Promise.all(
      files.projectLogo.map(async (file: Express.Multer.File) => {
        return await attachmentService.uploadSingleAttachment(
          file, FolderName.project, null, user, AttachedToType.project
        );
      })
    );
  }

  if (attachments.length > 0) {
      const firstAttachment = await attachmentService.getById(attachments[0]);
      if(firstAttachment) {
        req.body.projectLogo = firstAttachment.attachment;
      }
  }

  const result = await projectService.create(req.body);

  if (attachments.length > 0 && result._id) {
      await attachmentService.updateById(attachments[0], { projectId: result._id } as any);
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

  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'Project created successfully',
    success: true,
  });
});

const getAProject: RequestHandler = catchAsync(async (req, res) => {
    const result = await projectService.getById(req.params.projectId);
    sendResponse(res, {
        code: StatusCodes.OK,
        data: result,
        message: 'Project retrieved successfully',
        success: true,
    });
});

const getAllProject: RequestHandler = catchAsync(async (req, res) => {
    const result = await projectService.getAll();
    sendResponse(res, {
        code: StatusCodes.OK,
        data: result,
        message: 'All projects',
        success: true,
    });
});

const getAllProjectsByManager: RequestHandler = catchAsync(async (req, res) => {
  const user = req.user as TUser;
  if (!user || !user._id) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not found or invalid token');
  }
  const result = await projectService.getAllProjectsByManagerId(user._id);
  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'Manager projects retrieved successfully',
    success: true,
  });
});

const getAllProjectWithPagination: RequestHandler = catchAsync(async (req, res) => {
  // FIX: Cast req.user to 'any' to resolve all type conflicts.
  const user = req.user as any;

  // Now, we can safely access the _id from the user object.
  if (!user || !user._id) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'User information is missing');
  }

  const result = await projectService.getAllProjectsByManagerId(user._id.toString());

  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'Manager projects retrieved successfully',
    success: true,
  });
});

const updateById: RequestHandler = catchAsync(async (req, res) => {
    const result = await projectService.updateById(
        req.params.projectId,
        req.body
    );
    sendResponse(res, {
        code: StatusCodes.OK,
        data: result,
        message: 'Project updated successfully',
        success: true,
    });
});

const softDeleteById: RequestHandler = catchAsync(async (req, res) => {
    const result = await projectService.softDeleteById(req.params.projectId);
    sendResponse(res, {
        code: StatusCodes.OK,
        data: result,
        message: 'Project deleted successfully',
        success: true,
    });
});

const getAllimagesOrDocumentOFnoteOrTaskOrProjectByProjectId: RequestHandler = catchAsync(
    async (req, res) => {
        const { projectId, noteOrTaskOrProject, imageOrDocument, uploaderRole } =
            req.query;
        let result;
        if (projectId) {
            result =
                await projectService.getAllimagesOrDocumentOFnoteOrTaskByProjectId(
                    projectId as string,
                    noteOrTaskOrProject as string,
                    imageOrDocument as string,
                    uploaderRole as string
                );
        }
        sendResponse(res, {
            code: StatusCodes.OK,
            data: result,
            message: 'All images/documents by project id',
            success: true,
        });
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
};
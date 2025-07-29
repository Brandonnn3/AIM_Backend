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
import { Project } from '../project/project.model';

const projectService = new ProjectService();
const attachmentService = new AttachmentService();

// --- NO CHANGES TO THIS FUNCTION ---
const createProject: RequestHandler = catchAsync(async (req, res) => {
  const user = req.user as TUser;
  req.body.projectManagerId = user._id;
  req.body.projectStatus = 'planning';

  if (req.body.projectSuperVisorId) {
    req.body.projectSuperVisorIds = [req.body.projectSuperVisorId];
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

  if (result && result.projectSuperVisorIds && result.projectSuperVisorIds.length > 0) {
    const supervisorId = result.projectSuperVisorIds[0];
    const supervisor = await User.findById(supervisorId).select('fname lname');
    const supervisorName = supervisor ? `${supervisor.fname} ${supervisor.lname}` : 'A supervisor';

    const supervisorNotification: INotification = {
      title: `You have been assigned to project: '${result.projectName}'`,
      receiverId: supervisorId,
      role: UploaderRole.projectSupervisor,
      notificationFor: 'assign',
      projectId: result._id,
      linkId: result._id,
      isDeleted: false,
    };
    const notification = await NotificationService.addNotification(supervisorNotification);
    if (io) {
      io.to(supervisorId.toString()).emit('newNotification', {
        code: StatusCodes.OK,
        message: 'New notification',
        data: notification,
      });
    }

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

const getAssignableSupervisors: RequestHandler = catchAsync(async (req, res) => {
    const user = req.user as TUser;
    const { projectId } = req.params;

    if (!user.companyId) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Manager is not associated with a company.');
    }

    const project = await projectService.getById(projectId);
    if (!project) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Project not found.');
    }
    // ✨ FIX: Add explicit type 'Types.ObjectId' to the map parameter
    const assignedSupervisorIds = project.projectSuperVisorIds?.map((id: Types.ObjectId) => id.toString()) || [];

    const allSupervisors = await User.find({
        companyId: user.companyId,
        role: 'projectSupervisor'
    }).select('fname lname email profileImage');

    const assignableSupervisors = allSupervisors.map(supervisor => {
        // ✨ FIX: Use the 'id' virtual getter which is a string and always defined
        const isAssigned = assignedSupervisorIds.includes(supervisor.id);
        return {
            ...supervisor.toObject(),
            isAssigned
        };
    });

    sendResponse(res, {
        code: StatusCodes.OK,
        data: assignableSupervisors,
        message: 'Assignable supervisors fetched successfully.',
        success: true,
    });
});

const assignSupervisorsToProject: RequestHandler = catchAsync(async (req, res) => {
    const { projectId } = req.params;
    const { supervisorIds } = req.body;

    if (!Array.isArray(supervisorIds)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'supervisorIds must be an array.');
    }

    const projectBeforeUpdate = await projectService.getById(projectId);
    if (!projectBeforeUpdate) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Project not found.');
    }
    // ✨ FIX: Add explicit type 'Types.ObjectId' to the map parameter
    const oldSupervisorIds = projectBeforeUpdate.projectSuperVisorIds?.map((id: Types.ObjectId) => id.toString()) || [];

    const updatedProject = await projectService.updateById(projectId, {
        projectSuperVisorIds: supervisorIds
    });

    // ✨ FIX: Add explicit type 'string' to the map and filter parameters
    const newSupervisorIds = supervisorIds.map((id: string) => id.toString());
    const addedSupervisors = newSupervisorIds.filter((id: string) => !oldSupervisorIds.includes(id));
    const removedSupervisors = oldSupervisorIds.filter((id: string) => !newSupervisorIds.includes(id));

    const createNotification = async (supervisorId: string, action: 'assigned to' | 'removed from') => {
        const supervisor = await User.findById(supervisorId).select('fname lname');
        const supervisorName = supervisor ? `${supervisor.fname} ${supervisor.lname}` : 'A supervisor';

        const notificationPayload: INotification = {
            title: `Supervisor ${action === 'assigned to' ? 'Assigned' : 'Removed'}: ${supervisorName} was ${action} '${updatedProject.projectName}'.`,
            receiverId: updatedProject.projectManagerId,
            role: 'projectManager' as any,
            notificationFor: 'assign',
            projectId: updatedProject._id,
            linkId: updatedProject._id,
            isDeleted: false,
        };
        await NotificationService.addNotification(notificationPayload);
    };

    for (const id of addedSupervisors) {
        await createNotification(id, 'assigned to');
    }
    for (const id of removedSupervisors) {
        await createNotification(id, 'removed from');
    }

    sendResponse(res, {
        code: StatusCodes.OK,
        data: updatedProject,
        message: 'Supervisors updated successfully.',
        success: true,
    });
});


// --- NO CHANGES TO OTHER FUNCTIONS ---

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
  const project = await Project.findById(projectId).select('projectName projectManagerId');
  if (project && project.projectManagerId) {
    const uploaderName = user.fname ? `${user.fname} ${user.lname}` : 'A user';
    const documentName = customName || file.originalname;
    const notificationPayload: INotification = {
      title: `Document Uploaded: ${uploaderName} uploaded '${documentName}' to '${project.projectName}'.`,
      receiverId: project.projectManagerId,
      notificationFor: 'attachment',
      projectId: project._id as Types.ObjectId,
      linkId: newAttachment._id,
      role: 'projectManager' as any,
      isDeleted: false,
    };
    await NotificationService.addNotification(notificationPayload);
  }
  sendResponse(res, {
    code: StatusCodes.OK,
    data: newAttachment,
    message: 'Attachment created and linked successfully',
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
const getAProject: RequestHandler = catchAsync(async (req, res) => {
    const result = await projectService.getById(req.params.projectId);
    sendResponse(res, { code: StatusCodes.OK, data: result, message: 'Project retrieved successfully', success: true });
});
const getAllProject: RequestHandler = catchAsync(async (req, res) => {
    const result = await projectService.getAll();
    sendResponse(res, { code: StatusCodes.OK, data: result, message: 'All projects', success: true });
});

// ✨ FIX: Convert user._id from an ObjectId to a string before passing to the service
const getAllProjectsByManager: RequestHandler = catchAsync(async (req, res) => {
  const user = req.user as TUser;
  if (!user || !user._id) { throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not found or invalid token'); }
  const result = await projectService.getAllProjectsByManagerId(user._id.toString());
  sendResponse(res, { code: StatusCodes.OK, data: result, message: 'Manager projects retrieved successfully', success: true });
});

const getAllProjectsBySupervisor: RequestHandler = catchAsync(async (req, res) => {
  const user = req.user as TUser;
  if (!user || !user._id) { throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not found or invalid token'); }
  const result = await projectService.getAllProjectsBySupervisorId(user._id.toString());
  sendResponse(res, { code: StatusCodes.OK, data: result, message: 'Supervisor projects retrieved successfully', success: true });
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
    getAssignableSupervisors,
    assignSupervisorsToProject,
    getAllProjectsBySupervisor, 
};

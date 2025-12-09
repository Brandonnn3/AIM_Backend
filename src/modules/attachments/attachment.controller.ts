import { io } from '../../server';
import catchAsync from '../../shared/catchAsync';
import sendResponse from '../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';
import pick from '../../shared/pick';
import { AttachmentService } from './attachment.service';
import { FolderName } from '../../enums/folderNames';
import { AttachedToType, UploaderRole } from './attachment.constant';
import ApiError from '../../errors/ApiError';
import { NoteService } from '../note/note.service';
import { Project } from '../project/project.model';
import { NotificationService } from '../notification/notification.services';
import { TaskService } from '../task/task.service';
import { INotification } from '../notification/notification.interface';
import { TUser } from '../user/user.interface';

const attachmentService = new AttachmentService();
const noteService = new NoteService();
const taskService = new TaskService();

const createAttachment = catchAsync(async (req, res) => {
  const user = req.user as TUser;
  const { noteId, projectId, noteOrTaskOrProject, taskId, customName } = req.body;

  const attachedToId = noteId || taskId;
  if (!attachedToId || !projectId) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'A projectId and either a noteId or taskId are required to upload an attachment.',
    );
  }

  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
  if (!files || !files.attachments || files.attachments.length === 0) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Please upload at least one attachment',
    );
  }

  const attachments = await Promise.all(
    files.attachments.map(async (file: Express.Multer.File) => {
      return await attachmentService.uploadAndLinkAttachment(
        file,
        projectId,
        attachedToId,
        user,
        noteOrTaskOrProject || AttachedToType.note,
        customName,
      );
    }),
  );

  const projectNameAndSuperVisorId = await Project.findById(
    req.body.projectId,
  ).select('projectSuperVisorIds projectName projectManagerId');

  if (
    projectNameAndSuperVisorId &&
    projectNameAndSuperVisorId.projectSuperVisorIds &&
    projectNameAndSuperVisorId.projectSuperVisorIds.length > 0
  ) {
    for (const supervisorId of projectNameAndSuperVisorId.projectSuperVisorIds) {
      const notificationPayload: INotification = {
        title: `New attachment of ${projectNameAndSuperVisorId.projectName} ${noteOrTaskOrProject} has been uploaded by ${(user as any).fname}`,
        receiverId: supervisorId,
        notificationFor: 'attachment',
        role: UploaderRole.projectSupervisor,
        isDeleted: false,
      };
      const notification = await NotificationService.addNotification(
        notificationPayload,
      );
      if (io) {
        io.to(supervisorId.toString()).emit('newNotification', {
          code: StatusCodes.OK,
          message: 'New notification',
          data: notification,
        });
      }
    }
  }

  sendResponse(res, {
    code: StatusCodes.OK,
    data: attachments,
    message: 'Attachment created and linked successfully',
    success: true,
  });
});

const getAAttachment = catchAsync(async (req, res) => {
  const result = await attachmentService.getById(req.params.attachmentId);
  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'Project retrieved successfully',
    success: true,
  });
});

const getAllAttachment = catchAsync(async (req, res) => {
  const result = await attachmentService.getAll();
  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'All projects',
    success: true,
  });
});

const getAllAttachmentWithPagination = catchAsync(async (req, res) => {
  const filters = pick(req.query, ['projectName', '_id']);
  const options = pick(req.query, ['sortBy', 'limit', 'page', 'populate']);
  const result = await attachmentService.getAllWithPagination(filters, options);
  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'All projects with Pagination',
    success: true,
  });
});

const updateById = catchAsync(async (req, res) => {
  const result = await attachmentService.updateById(
    req.params.attachmentId,
    req.body,
  );
  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'Project updated successfully',
    success: true,
  });
});

const deleteById = catchAsync(async (req, res) => {
  const user = req.user as any;
  const attachment = await attachmentService.getById(req.params.attachmentId);

  if (!attachment) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Attachment not found');
  }

  // ✅ Normalize user id & role
  const userId =
    user?.userId?.toString?.() ??
    user?._id?.toString?.() ??
    user?.id?.toString?.();

  const role = (user?.role as string) || '';

  // ✅ Owner check (supports legacy uploaderId)
  const isOwner =
    attachment.uploadedByUserId?.toString() === userId ||
    (attachment as any).uploaderId?.toString() === userId;

  // ✅ Role-based allow
  const isManagerOrAdmin =
    role === 'projectManager' ||
    role === 'projectSupervisor' ||
    role === 'admin';

  if (!isOwner && !isManagerOrAdmin) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not authorized to delete this attachment',
    );
  }

  let results;

  if (attachment.attachedToType === 'project') {
    results = await attachmentService.deleteById(req.params.attachmentId);
    if (results) {
      await attachmentService.deleteAttachment(results.attachment);
    }
  } else if (attachment.attachedToType === 'note') {
    const note = await noteService.getById(attachment.attachedToId);
    if (note) {
      note.attachments = note.attachments.filter(
        (attachmentId: any) =>
          attachmentId._id.toString() !== req.params.attachmentId,
      );
      await noteService.updateById(note._id, note);
    }
    results = await attachmentService.deleteById(req.params.attachmentId);
    if (results) {
      await attachmentService.deleteAttachment(results.attachment);
    }
  } else if (attachment.attachedToType === 'task') {
    const task = await taskService.getById(attachment.attachedToId);
    if (task) {
      task.attachments = task.attachments.filter(
        (attachmentId: any) =>
          attachmentId._id.toString() !== req.params.attachmentId,
      );
      await taskService.updateById(task._id, task);
    }
    results = await attachmentService.deleteById(req.params.attachmentId);
    if (results) {
      await attachmentService.deleteAttachment(results.attachment);
    }
  }

  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Attachments deleted successfully',
    data: results,
    success: true,
  });
});

const addOrRemoveReact = catchAsync(async (req, res) => {
  const { attachmentId } = req.params;
  const userId = (req.user as any).userId;
  if (!userId) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'User ID not found');
  }
  const result = await attachmentService.addOrRemoveReact(attachmentId, userId);
  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'React successfully',
    success: true,
  });
});

const deleteByFileUrl = catchAsync(async (req, res) => {
  const { fileUrl } = req.body;
  if (!fileUrl) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Please provide a file URL');
  }

  const result = await attachmentService.deleteAttachment(fileUrl);
  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'Attachment deleted successfully',
    success: true,
  });
});

export const AttachmentController = {
  createAttachment,
  getAllAttachment,
  getAllAttachmentWithPagination,
  getAAttachment,
  updateById,
  deleteById,
  addOrRemoveReact,
  deleteByFileUrl,
};

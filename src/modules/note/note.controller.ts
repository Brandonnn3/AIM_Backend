// AIM_Backend/src/modules/note/note.controller.ts

import { RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import { io } from '../../server';
import { AttachedToType, UploaderRole } from '../attachments/attachment.constant';
import { AttachmentService } from '../attachments/attachment.service';
import ApiError from '../../errors/ApiError';
import { INotification } from '../notification/notification.interface';
import { NotificationService } from '../notification/notification.services';
import catchAsync from '../../shared/catchAsync';
import pick from '../../shared/pick';
import sendResponse from '../../shared/sendResponse';
import { TUser } from '../user/user.interface';
import { noteStatus } from './note.constant';
import { NoteService } from './note.service';
import { Project } from '../project/project.model';
import { Types } from 'mongoose';

const noteService = new NoteService();
const attachmentService = new AttachmentService();

// --- NO CHANGES IN THIS FUNCTION ---
const createNote: RequestHandler = catchAsync(async (req, res) => {
  const user = req.user as any;
  if (!user || !user._id) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated or user ID missing in token.');
  }
  const project = await Project.findById(req.body.projectId);
  if (!project) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Project not found');
  }
  const userId = user._id.toString();
  const projectManagerId = project.projectManagerId?.toString();
  const projectSupervisorIds = project.projectSuperVisorIds
    ? project.projectSuperVisorIds.toString()
    : null;
  if (userId !== projectManagerId && userId !== projectSupervisorIds) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not authorized to add notes to this project.'
    );
  }
  const notePayload = { ...req.body };
  notePayload.createdBy = user._id;
  notePayload.isAccepted = noteStatus.pending;
  if (req.body.date) {
    notePayload.createdAt = new Date(req.body.date);
  }
  delete notePayload.attachments;
  const result = await noteService.create(notePayload);
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  if (files && files.attachments) {
    await Promise.all(
      files.attachments.map(async (file: Express.Multer.File) => {
        return await attachmentService.uploadAndLinkAttachment(
          file,
          result.projectId,
          result._id,
          user,
          AttachedToType.note
        );
      })
    );
  }
  const MAX_TITLE_LENGTH = 23;
  const truncatedTitle =
    result.title.length > MAX_TITLE_LENGTH
      ? result.title.substring(0, MAX_TITLE_LENGTH) + '...'
      : result.title;
  const creatorName = user.userName || user.fname || 'A user';
  const notificationPayload: INotification = {
    title: `Note "${truncatedTitle}" created by ${creatorName}`,
    receiverId: project.projectManagerId,
    role: UploaderRole.projectManager,
    notificationFor: 'note',
    linkId: result._id,
    projectId: project._id as Types.ObjectId,
    isDeleted: false,
  };
  const notification = await NotificationService.addNotification(notificationPayload);
  if (io && project.projectManagerId) {
    io.to(project.projectManagerId.toString()).emit('newNotification', {
      code: StatusCodes.OK,
      message: 'New notification',
      data: notification,
    });
  }
  sendResponse(res, {
    code: StatusCodes.CREATED,
    data: result,
    message: 'Note created successfully',
    success: true,
  });
});

// --- NO CHANGES IN THESE FUNCTIONS ---
const getANote: RequestHandler = catchAsync(async (req, res) => {
    const result = await noteService.getById(req.params.noteId);
    sendResponse(res, {
        code: StatusCodes.OK,
        data: result,
        message: 'Note retrieved successfully',
        success: true,
    });
});
const getAllNote: RequestHandler = catchAsync(async (req, res) => {
    const result = await noteService.getAll();
    sendResponse(res, {
        code: StatusCodes.OK,
        data: result,
        message: 'All notes',
        success: true,
    });
});
const getAllNoteWithPagination: RequestHandler = catchAsync(async (req, res) => {
    const filters = pick(req.query, ['noteName', '_id']);
    const options = pick(req.query, ['sortBy', 'limit', 'page', 'populate']);
    const result = await noteService.getAllWithPagination(filters, options);
    sendResponse(res, {
        code: StatusCodes.OK,
        data: result,
        message: 'All notes with Pagination',
        success: true,
    });
});
const updateById: RequestHandler = catchAsync(async (req, res) => {
    const result = await noteService.updateById(req.params.noteId, req.body);
    sendResponse(res, {
        code: StatusCodes.OK,
        data: result,
        message: 'Note updated successfully',
        success: true,
    });
});
const deleteById: RequestHandler = catchAsync(async (req, res) => {
    await noteService.deleteNoteAndAttachments(req.params.noteId);
    sendResponse(res, {
        code: StatusCodes.OK,
        message: 'Note and its attachments deleted successfully',
        success: true,
    });
});
const getAllByDateAndProjectId: RequestHandler = catchAsync(async (req, res) => {
    const { projectId, date } = req.query;
    let result;
    if (date && projectId) {
        result = await noteService.getAllByDateAndProjectId(
            projectId as string,
            date as string
        );
    }
    sendResponse(res, {
        code: StatusCodes.OK,
        data: result,
        message: 'All notes by date and project id',
        success: true,
    });
});
const getPreviewByDateAndProjectId: RequestHandler = catchAsync(async (req, res) => {
    const { projectId, date } = req.query;
    let result;
    if (date && projectId) {
        result = await noteService.getPreviewByDateAndProjectId(
            projectId as string,
            date as string
        );
    }
    sendResponse(res, {
        code: StatusCodes.OK,
        data: result,
        message: 'All notes by date and project id',
        success: true,
    });
});
const getAllimagesOrDocumentOFnoteOrTaskOrProjectByDateAndProjectId: RequestHandler = catchAsync(
    async (req, res) => {
        const {
            projectId,
            date,
            noteOrTaskOrProject,
            imageOrDocument,
            uploaderRole,
        } = req.query;
        const result =
            await noteService.getAllimagesOrDocumentOFnoteOrTaskByDateAndProjectId(
                projectId as string,
                date as string,
                noteOrTaskOrProject as string,
                imageOrDocument as string,
                uploaderRole as string
            );
        sendResponse(res, {
            code: StatusCodes.OK,
            data: result,
            message: 'All images/documents by project id',
            success: true,
        });
    }
);
const changeStatusOfANote: RequestHandler = catchAsync(async (req, res) => {
    const result = await noteService.getById(req.params.noteId);
    if (result) {
        if (result.isAccepted === noteStatus.accepted) {
            result.isAccepted = noteStatus.pending;
        } else if (result.isAccepted === noteStatus.pending) {
            result.isAccepted = noteStatus.accepted;
        }
        await result.save();
    }
    sendResponse(res, {
        code: StatusCodes.OK,
        data: result,
        message: 'Note status changed successfully',
        success: true,
    });
});

const changeStatusOfANoteWithDeny: RequestHandler = catchAsync(async (req, res) => {
    const { status } = req.query;
    if (!status || !Object.values(noteStatus).includes(status as noteStatus)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'A valid status is required.');
    }
    
    const result = await noteService.getById(req.params.noteId);
    if (result) {
        result.isAccepted = status as noteStatus;
        await result.save();

        // This block now creates the correct activity type
        if (status === noteStatus.accepted) {
            const project = await Project.findById(result.projectId);
            if (project && project.projectManagerId) {
                 const notificationPayload: INotification = {
                    title: `Daily Log Approved: '${result.title}' was approved.`,
                    receiverId: project.projectManagerId,
                    // ✨ FIX: Use the 'log' type for approvals
                    notificationFor: 'log', 
                    projectId: result.projectId,
                    linkId: result._id,
                    role: 'projectManager' as any,
                    isDeleted: false,
                };
                await NotificationService.addNotification(notificationPayload);
            }
        }
    }
    sendResponse(res, {
        code: StatusCodes.OK,
        data: result,
        message: `Note is ${status}`,
        success: true,
    });
});

export const NoteController = {
    createNote,
    getANote,
    getAllNote,
    getAllNoteWithPagination,
    updateById,
    deleteById,
    getAllByDateAndProjectId,
    getPreviewByDateAndProjectId,
    getAllimagesOrDocumentOFnoteOrTaskOrProjectByDateAndProjectId,
    changeStatusOfANote,
    changeStatusOfANoteWithDeny,
};

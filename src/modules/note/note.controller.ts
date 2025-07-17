// src/modules/note/note.controller.ts

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
import { noteStatus } from './note.constant';
import { NoteService } from './note.service';
import { Project } from '../project/project.model';
import { Types } from 'mongoose';

const noteService = new NoteService();
const attachmentService = new AttachmentService();

const createNote: RequestHandler = catchAsync(async (req, res) => {
  // --- Enhanced Logging for Debugging ---
  console.log('--- CREATE NOTE REQUEST ---');
  console.log('HEADERS:', req.headers);
  console.log('BODY:', req.body);
  console.log('FILES:', req.files);
  console.log('USER FROM TOKEN:', req.user); // ✨ Log the user object to see its structure
  console.log('--------------------------');

  const user = req.user as any;

  // ✨ FIX: Check for user and user._id from the auth token. This is the likely source of the 401 error.
  if (!user || !user._id) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated or user ID missing in token.');
  }

  const project = await Project.findById(req.body.projectId);
  if (!project) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Project not found');
  }

  const userId = user._id.toString(); // ✨ FIX: Use user._id from the token
  const projectManagerId = project.projectManagerId?.toString();
  const projectSupervisorId = project.projectSuperVisorId
    ? project.projectSuperVisorId.toString()
    : null;

  if (userId !== projectManagerId && userId !== projectSupervisorId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not authorized to add notes to this project.'
    );
  }

  req.body.createdBy = user._id; // ✨ FIX: Use user._id
  req.body.isAccepted = noteStatus.pending;

  // ✨ NEW: Handle the date sent from the client.
  // If the frontend sends a date string (e.g., "2025-07-16"), this will set the
  // note's creation timestamp to that specific date. This prevents timezone
  // issues and ensures the note appears on the correct day in the UI.
  if (req.body.date) {
    req.body.createdAt = new Date(req.body.date);
  }

  let attachments: string[] = [];
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  if (files && files.attachments) {
    attachments = await Promise.all(
      files.attachments.map(async (file: Express.Multer.File) => {
        return await attachmentService.uploadSingleAttachment(
          file, FolderName.note, req.body.projectId, user, AttachedToType.note
        );
      })
    );
  }
  req.body.attachments = attachments;

  const result = await noteService.create(req.body);

  if (attachments.length > 0) {
    await Promise.all(
      attachments.map(async (attachmentId: string) => {
        await attachmentService.updateById(attachmentId, {
          attachedToId: result._id,
        } as any);
      })
    );
  }

  const MAX_TITLE_LENGTH = 23;
  const truncatedTitle =
    result.title.length > MAX_TITLE_LENGTH
      ? result.title.substring(0, MAX_TITLE_LENGTH) + '...'
      : result.title;

  // ✨ FIX: Ensure user.userName exists, otherwise provide a fallback.
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
    code: StatusCodes.CREATED, // ✨ FIX: Use 201 Created for successful resource creation
    data: result,
    message: 'Note created successfully',
    success: true,
  });
});

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
    const note = await noteService.getById(req.params.noteId);
    if (note && note.attachments && note.attachments.length > 0) {
        await Promise.all(
            note.attachments.map(async (attachmentId: any) => {
                const attachment = await attachmentService.getById(attachmentId);
                if (attachment) {
                    await attachmentService.deleteById(attachmentId);
                }
            })
        );
    }
    await noteService.deleteById(req.params.noteId);
    sendResponse(res, {
        code: StatusCodes.OK,
        message: 'Note deleted successfully',
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
        let result;
        if (date && projectId) {
            result =
                await noteService.getAllimagesOrDocumentOFnoteOrTaskByDateAndProjectId(
                    projectId as string,
                    date as string,
                    noteOrTaskOrProject as string,
                    imageOrDocument as string,
                    uploaderRole as string
                );
        }
        sendResponse(res, {
            code: StatusCodes.OK,
            data: result,
            message: 'All notes by date and project id',
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
    if (!status) {
        res.status(400).json({ error: 'Status is required' });
        return;
    }
    if (!Object.values(noteStatus).includes(status as noteStatus)) {
        res.status(400).json({
            error: `Invalid status value. it can be  ${Object.values(noteStatus).join(
                ', '
            )}`,
        });
        return;
    }
    const result = await noteService.getById(req.params.noteId);
    if (result) {
        result.isAccepted = status as noteStatus;
        await result.save();
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

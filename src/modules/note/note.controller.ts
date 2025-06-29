import { GenericService } from '../Generic Service/generic.services';
import catchAsync from '../../shared/catchAsync';
import sendResponse from '../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';
import pick from '../../shared/pick';
import { Note } from './note.model';
import { NoteService } from './note.service';
import { AttachmentService } from '../attachments/attachment.service';
import { FolderName } from '../../enums/folderNames';
import { AttachedToType } from '../attachments/attachment.constant';
import { noteStatus } from './note.constant';
import { Project } from '../project/project.model';
import { NotificationService } from '../notification/notification.services';
import { sendPushNotification } from '../../utils/firebaseUtils';
import { User } from '../user/user.model';
import ApiError from '../../errors/ApiError';

const noteService = new NoteService();
const attachmentService = new AttachmentService();

//[🚧][🧑‍💻✅][🧪🆗] // working perfectly
const createNote = catchAsync(async (req, res) => {
  if (req.user.userId) {
    req.body.createdBy = req.user.userId;
  }

  req.body.isAccepted = noteStatus.pending;

  // TODO : attachment upload handle kora lagbe

  // let attachments = [];

  // if (req.files && req.files.attachments) {
  //   attachments.push(
  //     ...(await Promise.all(
  //       req.files.attachments.map(async (file) => {
  //         const attachmentUrl = await attachmentService.uploadSingleAttachment(file, FolderName.note)
  //         return attachmentUrl;        })
  //     ))
  //   );
  // }

  let attachments = [];

  if (req.files && req.files.attachments) {
    attachments.push(
      ...(await Promise.all(
        req.files.attachments.map(async file => {
          const attachmentId = await attachmentService.uploadSingleAttachment(
            file,
            FolderName.note,
            req.body.projectId,
            req.user,
            AttachedToType.note
          );
          return attachmentId;
        })
      ))
    );
  }

  // INFO : its useful for update ..
  // else{
  //   attachments = [...note.attachments]
  // }

  req.body.attachments = attachments;

  const result = await noteService.create(req.body);

  // Now loop through the attachments array and update the attachedToId and attachedToType
  if (attachments.length > 0) {
    await Promise.all(
      attachments.map(async attachmentId => {
        // Assuming you have a service or model method to update the attachment's attachedToId and attachedToType
        await attachmentService.updateById(
          attachmentId, // Pass the attachment ID
          {
            attachedToId: result._id,
          }
        );
      })
    );
  }

  /*** ✅ NOTIFICATION LOGIC STARTS HERE ✅ ***/

  // 1️⃣ Find the ProjectManager for the given projectId

  const project = await Project.findById(req.body.projectId).populate(
    'projectManagerId'
  );
  /*
  if (project && project.projectManagerId) {
    const notificationPayload = {
      title: "New Note Created",
      message: `A new dailyLog ${result.title} has been created by ${req.user.userName}.`,
      receiverId: project.projectManagerId, // Send to ProjectManager
      role: "projectManager",
      image: project.projectLogo || "", // req.user.profilePicture || "", // Optional
      linkId: result._id, // Link to the note
    };

    // 2️⃣ Save Notification to Database
    const notification = await NotificationService.addNotification(notificationPayload);

    // 3️⃣ Send Real-Time Notification using Socket.io
    io.to(project.projectManagerId.toString()).emit("newNotification", {
      code: StatusCodes.OK,
      message: "New notification",
      data: notification,
    });
  }

  */

  // const notificationReceivers = [];

  // if (project && project.projectManagerId) {
  //   notificationReceivers.push(project.projectManagerId);
  // }

  if (!project) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Project not found');
  }

  // for (const receiverId of notificationReceivers) {
  // Fetch FCM token from User Model
  const user = await User.findById(project?.projectManagerId);

  // 🔴🔴🔴 // INFO :  For push notification
  // const registrationToken = user?.fcmToken;

  // if (registrationToken) {
  //   await sendPushNotification(
  //     registrationToken,
  //     `A new note of DailyLog ${result.title} has been created by  ${req.user.userName} .`,
  //     project.projectManagerId.toString()
  //   );
  // }

  const MAX_TITLE_LENGTH = 23; // Set a max length for the title

  const truncatedTitle =
    result.title.length > MAX_TITLE_LENGTH
      ? result.title.substring(0, MAX_TITLE_LENGTH) + '...'
      : result.title;

  // Save Notification to Database
  const notificationPayload = {
    title: `Note ${truncatedTitle} has been created by ${req.user.userName}`,
    // message: `A new task "${result.title}" has been created by `,
    receiverId: project?.projectManagerId,
    role: 'projectManager', // If receiver is the projectManager
    notificationFor: 'note',
    linkId: result._id,
    projectId: project._id,
  };

  const notification = await NotificationService.addNotification(
    notificationPayload
  );

  // 3️⃣ Send Real-Time Notification using Socket.io
  io.to(project?.projectManagerId.toString()).emit('newNotification', {
    code: StatusCodes.OK,
    message: 'New notification',
    data: notification,
  });

  // }

  /*** ✅ NOTIFICATION LOGIC ENDS HERE ✅ ***/

  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'Note created successfully',
    success: true,
  });
});

const getANote = catchAsync(async (req, res) => {
  const result = await noteService.getById(req.params.noteId);
  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'Note retrieved successfully',
    success: true,
  });
});

const getAllNote = catchAsync(async (req, res) => {
  const result = await noteService.getAll();
  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'All notes',
    success: true,
  });
});

const getAllNoteWithPagination = catchAsync(async (req, res) => {
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

const updateById = catchAsync(async (req, res) => {
  const result = await noteService.updateById(req.params.noteId, req.body);
  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'Note updated successfully',
    success: true,
  });
});

//[🚧][🧑‍💻✅][🧪🆗] // working perfectly
const deleteById = catchAsync(async (req, res) => {
  // INFO : Before deleting the note , we have to delete the note related attachments first

  const note = await noteService.getById(req.params.noteId);
  if (note) {
    if (note.attachments && note.attachments.length > 0) {
      await Promise.all(
        note.attachments.map(async attachmentId => {
          // ei attachment id ta exist kore kina sheta age check korte hobe
          let attachment = await attachmentService.getById(attachmentId);
          if (attachment) {
            const attachmentDeleteRes = await attachmentService.deleteById(
              attachmentId
            );
          } else {
            console.log('attachment not found ...');
          }
        })
      );
    }
  }

  await noteService.deleteById(req.params.noteId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Note deleted successfully',
    success: true,
  });
});

/////////////////////////////////

const getAllByDateAndProjectId = catchAsync(async (req, res) => {
  console.log(req.query);
  const { projectId, date } = req.query;
  let result;
  if (date && projectId) {
    result = await noteService.getAllByDateAndProjectId(projectId, date);
  }
  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'All notes by date and project id',
    success: true,
  });
});

const getPreviewByDateAndProjectId = catchAsync(async (req, res) => {
  console.log(req.query);
  const { projectId, date } = req.query;
  let result;
  if (date && projectId) {
    result = await noteService.getPreviewByDateAndProjectId(projectId, date);
  }
  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'All notes by date and project id',
    success: true,
  });
});

//////////////////////////////

const getAllimagesOrDocumentOFnoteOrTaskOrProjectByDateAndProjectId =
  catchAsync(async (req, res) => {
    console.log(req.query);
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
          projectId,
          date,
          noteOrTaskOrProject,
          imageOrDocument,
          uploaderRole
        );
    }
    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'All notes by date and project id',
      success: true,
    });
  });

const changeStatusOfANote = catchAsync(async (req, res) => {
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

const changeStatusOfANoteWithDeny = catchAsync(async (req, res) => {
  const { status } = req.query;

  // Step 1: Check if status is present in req.query
  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  // Step 2: Check if status is one of the valid values in noteStatus enum
  if (!Object.values(noteStatus).includes(status as noteStatus)) {
    return res.status(400).json({
      error: `Invalid status value. it can be  ${Object.values(noteStatus).join(
        ', '
      )}`,
    });
  }

  const result = await noteService.getById(req.params.noteId);

  result.isAccepted = status;

  await result.save();

  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: `Note is ${status}`,
    success: true,
  });
});

export const NoteController = {
  createNote,
  getAllNote,
  getAllNoteWithPagination,
  getANote,
  updateById,
  deleteById,
  /////////
  getAllByDateAndProjectId,
  getPreviewByDateAndProjectId,
  getAllimagesOrDocumentOFnoteOrTaskOrProjectByDateAndProjectId,
  changeStatusOfANote,
  changeStatusOfANoteWithDeny,
};

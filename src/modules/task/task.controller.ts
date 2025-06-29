import catchAsync from '../../shared/catchAsync';
import sendResponse from '../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';
import pick from '../../shared/pick';
import { TaskService } from './task.service';
import { TaskStatus } from './task.constant';
import { AttachmentService } from '../attachments/attachment.service';
import { FolderName } from '../../enums/folderNames';
import { AttachedToType } from '../attachments/attachment.constant';
import { NotificationService } from '../notification/notification.services';
import { Project } from '../project/project.model';
import { sendPushNotification } from '../../utils/firebaseUtils';
import ApiError from '../../errors/ApiError';

const taskService = new TaskService();
const attachmentService = new AttachmentService();

const changeStatusOfATaskFix = catchAsync(async (req, res) => {
  const { status } = req.query;

  // Step 1: Check if status is present in req.query
  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  // Step 2: Check if status is one of the valid values in noteStatus enum
  if (!Object.values(TaskStatus).includes(status as TaskStatus)) {
    return res
      .status(400)
      .json({
        error: `Invalid status value. it can be  ${Object.values(
          noteStatus
        ).join(', ')}`,
      });
  }

  const result = await taskService.getById(req.params.taskId);

  result.task_status = status;

  await result.save();

  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'Task status changed successfully',
    success: true,
  });
});

const changeStatusOfATask = catchAsync(async (req, res) => {
  const result = await taskService.getById(req.params.taskId);
  if (result) {
    if (result.task_status === TaskStatus.open) {
      result.task_status = TaskStatus.complete;
    } else if (result.task_status === TaskStatus.complete) {
      result.task_status = TaskStatus.open;
    }

    await result.save();
  }
  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'Task status changed successfully',
    success: true,
  });
});

//[🚧][🧑‍💻✅][🧪🆗] // working perfectly
const createTask = catchAsync(async (req, res) => {
  if (req.user.userId) {
    req.body.createdBy = req.user.userId;
  }

  req.body.task_status = TaskStatus.open;

  let attachments = [];

  if (req.files && req.files.attachments) {
    attachments.push(
      ...(await Promise.all(
        req.files.attachments.map(async file => {
          const attachmenId = await attachmentService.uploadSingleAttachment(
            file,
            FolderName.task,
            req.body.projectId,
            req.user,
            AttachedToType.task
          );
          return attachmenId;
        })
      ))
    );
  }

  req.body.attachments = attachments;

  const result = await taskService.create(req.body);

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
    'projectSuperVisorId'
  );

  if (!project) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'Project is not found by projectId also cannot populate by projectSuperVisorId'
    );
  }

  if ((project && project.projectSuperVisorId) || result.assignedTo) {
    const registrationToken = req.user?.fcmToken;

    if (registrationToken) {
      await sendPushNotification(
        registrationToken,
        // INFO : amar title, message dorkar nai .. just .. title hoilei hobe ..
        `A new note of DailyLog ${result.title} has been created by  ${req.user.userName} .`,
        project.projectManagerId.toString()
      );
    }

    const MAX_TITLE_LENGTH = 23; // Set a max length for the title

    const truncatedTaskName =
      result.title.length > MAX_TITLE_LENGTH
        ? result.title.substring(0, MAX_TITLE_LENGTH) + '...'
        : result.title;

    const notificationPayload = {
      title: `Task ${truncatedTaskName} Created has been created by ${req.user.userName}.`,
      // message: `A new task ${result.title} has been created by ${req.user.userName}.`,
      receiverId: project.projectSuperVisorId, // receiver is  projectSuperVisor
      notificationFor: 'task',
      role: 'projectSupervisor', // TODO :  check korte hobe .. thik ase kina ..
      image: project.projectLogo || '', // req.user.profilePicture || "", // Optional
      projectId: project._id,
      extraInformation: project.projectName,

      linkId: result._id, // Link to the note
    };

    // 2️⃣ Save Notification to Database
    const notification = await NotificationService.addNotification(
      notificationPayload
    );

    // 3️⃣ Send Real-Time Notification using Socket.io
    io.to(project.projectManagerId.toString()).emit('newNotification', {
      code: StatusCodes.OK,
      message: 'New notification',
      data: notification,
    });
  }

  /*** ✅ NOTIFICATION LOGIC ENDS HERE ✅ ***/

  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'Task created successfully',
  });
});

const getATask = catchAsync(async (req, res) => {
  const result = await taskService.getById(req.params.taskId);
  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'Task retrieved successfully',
  });
});

const getAllTask = catchAsync(async (req, res) => {
  const result = await taskService.getAll();
  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'All Tasks',
  });
});

const getAllTaskWithPagination = catchAsync(async (req, res) => {
  const filters = pick(req.query, ['_id', 'title', 'task_status', 'projectId']); // 'projectName',
  const options = pick(req.query, ['sortBy', 'limit', 'page', 'populate']);

  options.populate = [
    {
      path: 'assignedTo',
      select:
        ' -createdAt -updatedAt -__v -failedLoginAttempts -isDeleted -isResetPassword -isEmailVerified -isDeleted -superVisorsManagerId -role -fcmToken -profileImage -email ', //-audioFile
    },
    {
      path: 'attachments',
      select: ' -createdAt -updatedAt -__v ',
    },
  ];

  const query = {};

  // Create a copy of filter without isPreview to handle separately
  const mainFilter = { ...filters };

  // Loop through each filter field and add conditions if they exist
  for (const key of Object.keys(mainFilter)) {
    if (key === 'title' && mainFilter[key] !== '') {
      query[key] = { $regex: mainFilter[key], $options: 'i' }; // Case-insensitive regex search for name
    } else {
      query[key] = mainFilter[key];
    }
  }

  const result = await taskService.getAllWithPagination(query, options);

  // Process the result to include imageCount and documentCount
  const modifiedResult = result.results.map(task => {
    const imageCount = task.attachments.filter(
      attachment => attachment.attachmentType === 'image'
    ).length;
    const documentCount = task.attachments.filter(
      attachment => attachment.attachmentType === 'document'
    ).length;

    return {
      ...task._doc,
      imageCount,
      documentCount,
    };
  });

  sendResponse(res, {
    code: StatusCodes.OK,
    data: modifiedResult, // result, // modifiedResult, // result,
    message: 'All tasks with Pagination',
  });
});

const updateById = catchAsync(async (req, res) => {
  const result = await taskService.updateById(req.params.taskId, req.body);
  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'Task updated successfully',
  });
});

//[🚧][🧑‍💻✅][🧪🆗] // working perfectly
const deleteById = catchAsync(async (req, res) => {
  const task = await taskService.getById(req.params.taskId);

  if (task) {
    if (task.attachments && task.attachments.length > 0) {
      await Promise.all(
        task.attachments.map(async attachmentId => {
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
  await taskService.deleteById(req.params.taskId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Task deleted successfully',
  });
});

export const TaskController = {
  createTask,
  getAllTask,
  getAllTaskWithPagination,
  getATask,
  updateById,
  deleteById,
  changeStatusOfATask,
  changeStatusOfATaskFix,
};

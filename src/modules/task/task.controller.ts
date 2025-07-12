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
import { TUser } from '../user/user.interface';
import { INotification } from '../notification/notification.interface';
import { io } from '../../server';
import { Types } from 'mongoose'; // Make sure mongoose Types is imported

const taskService = new TaskService();
const attachmentService = new AttachmentService();

const changeStatusOfATaskFix = catchAsync(async (req, res) => {
  const { status } = req.query;

  if (!status) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Status is required');
  }

  if (!Object.values(TaskStatus).includes(status as TaskStatus)) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Invalid status value. It can be ${Object.values(TaskStatus).join(', ')}`
    );
  }

  const result = await taskService.getById(req.params.taskId);

  if (result) {
    result.task_status = status as TaskStatus;
    await result.save();
  }

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

const createTask = catchAsync(async (req, res) => {
  const user = req.user as any;
  if (user.userId) {
    req.body.createdBy = user.userId;
  }

  req.body.task_status = TaskStatus.open;

  let attachments: string[] = [];
  
  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

  if (files && files.attachments) {
    attachments = await Promise.all(
      files.attachments.map(async (file: Express.Multer.File) => {
        const attachmenId = await attachmentService.uploadSingleAttachment(
          file,
          FolderName.task,
          req.body.projectId,
          user,
          AttachedToType.task
        );
        return attachmenId;
      })
    );
  }

  req.body.attachments = attachments;

  const result = await taskService.create(req.body);

  if (attachments.length > 0) {
    await Promise.all(
      attachments.map(async (attachmentId: string) => {
        await attachmentService.updateById(
          attachmentId,
          {
            attachedToId: result._id,
          } as any
        );
      })
    );
  }

  const project = await Project.findById(req.body.projectId).populate('projectSuperVisorId');

  if (!project) {
    throw new ApiError(StatusCodes.NOT_FOUND,'Project is not found');
  }

  if ((project && project.projectSuperVisorId) || result.assignedTo) {
    const registrationToken = user?.fcmToken;

    if (registrationToken) {
      await sendPushNotification(
        registrationToken,
        `A new note of DailyLog ${result.title} has been created by  ${user.userName} .`,
        project.projectManagerId.toString()
      );
    }

    const MAX_TITLE_LENGTH = 23;
    const truncatedTaskName =
      result.title.length > MAX_TITLE_LENGTH
        ? result.title.substring(0, MAX_TITLE_LENGTH) + '...'
        : result.title;
        
    const notificationPayload: INotification = {
      title: `Task ${truncatedTaskName} Created has been created by ${user.userName}.`,
      receiverId: project.projectSuperVisorId,
      notificationFor: 'task',
      role: 'projectSupervisor' as any,
      image: project.projectLogo || '',
      projectId: project._id as Types.ObjectId,
      extraInformation: project.projectName,
      linkId: result._id,
      isDeleted: false,
    };

    const notification = await NotificationService.addNotification(
      notificationPayload
    );
    
    if (io) {
      io.to(project.projectManagerId.toString()).emit('newNotification', {
        code: StatusCodes.OK,
        message: 'New notification',
        data: notification,
      });
    }
  }

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
  const filters = pick(req.query, ['_id', 'title', 'task_status', 'projectId']);
  const options = pick(req.query, ['sortBy', 'limit', 'page', 'populate']);

  options.populate = [
    {
      path: 'assignedTo',
      select:
        ' -createdAt -updatedAt -__v -failedLoginAttempts -isDeleted -isResetPassword -isEmailVerified -isDeleted -superVisorsManagerId -role -fcmToken -profileImage -email ',
    },
    {
      path: 'attachments',
      select: ' -createdAt -updatedAt -__v ',
    },
  ];

  const query: any = {};

  const mainFilter = { ...filters };

  for (const key of Object.keys(mainFilter)) {
    if (key === 'title' && mainFilter[key] !== '') {
      query[key] = { $regex: mainFilter[key], $options: 'i' };
    } else {
      query[key] = mainFilter[key];
    }
  }

  const result = await taskService.getAllWithPagination(query, options);

  const modifiedResult = result.results.map((task: any) => {
    const imageCount = task.attachments.filter(
      (attachment: any) => attachment.attachmentType === 'image'
    ).length;
    const documentCount = task.attachments.filter(
      (attachment: any) => attachment.attachmentType === 'document'
    ).length;

    return {
      ...task._doc,
      imageCount,
      documentCount,
    };
  });

  sendResponse(res, {
    code: StatusCodes.OK,
    data: modifiedResult,
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

const deleteById = catchAsync(async (req, res) => {
  const task = await taskService.getById(req.params.taskId);

  if (task) {
    if (task.attachments && task.attachments.length > 0) {
      await Promise.all(
        task.attachments.map(async (attachmentId: any) => {
          const attachment = await attachmentService.getById(attachmentId);
          if (attachment) {
            await attachmentService.deleteById(attachmentId);
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
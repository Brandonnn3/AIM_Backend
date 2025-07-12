import { StatusCodes } from 'http-status-codes';
import { INotification } from './notification.interface';
import { Notification } from './notification.model';
import { User } from '../user/user.model';
import { PaginateOptions, PaginateResult } from '../../types/paginate';
import ApiError from '../../errors/ApiError';
// FIX: Import the UploaderRole enum
import { UploaderRole } from '../attachments/attachment.constant';
import { io } from '../../server';


const addNotification = async (
  payload: INotification
): Promise<INotification> => {
  // Save the notification to the database
  const result = await Notification.create(payload);
  return result;
};

const getALLNotification = async (
  filters: Partial<INotification>,
  options: PaginateOptions,
  userId: string
) => {
  filters.receiverId = userId;
  const unViewNotificationCount = await Notification.countDocuments({
    receiverId: userId,
    viewStatus: false,
  });

  const result = await Notification.paginate(filters, options);
  return { ...result, unViewNotificationCount };
};

const getAdminNotifications = async (
  filters: Partial<INotification>,
  options: PaginateOptions
): Promise<PaginateResult<INotification>> => {
  // FIX: Use the enum member directly instead of a string
  filters.role = UploaderRole.admin;
  return Notification.paginate(filters, options);
};

const getSingleNotification = async (
  notificationId: string
): Promise<INotification | null> => {
  const result = await Notification.findById(notificationId);
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Notification not found');
  }
  return result;
};

const addCustomNotification = async (
  eventName: string,
  notifications: INotification,
  userId?: string
) => {
  const messageEvent = `${eventName}::${userId}`;
  const result = await addNotification(notifications);

  // FIX: Use the enum member directly instead of a string
  if (eventName === 'admin-notification' && notifications.role === UploaderRole.admin) {
    if (io) {
        io.emit('admin-notification', {
        code: StatusCodes.OK,
        message: 'New notification',
        data: result,
      });
    }
  } else {
    if (io) {
        io.emit(messageEvent, {
        code: StatusCodes.OK,
        message: 'New notification',
        data: result,
      });
    }
  }
  return result;
};

const viewNotification = async (notificationId: string) => {
  const result = await Notification.findByIdAndUpdate(
    notificationId,
    { viewStatus: true },
    { new: true }
  );
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Notification not found');
  }
  return result;
};

const deleteNotification = async (notificationId: string) => {
  const result = await Notification.findByIdAndDelete(notificationId);
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Notification not found');
  }
  return result;
};

const clearAllNotification = async (userId: string) => {
  const user = await User.findById(userId);
  if (user?.role === 'projectManager') {
    const result = await Notification.deleteMany({ role: UploaderRole.projectManager });
    return result;
  }
  const result = await Notification.deleteMany({ receiverId: userId });
  return result;
};
export const NotificationService = {
  addNotification,
  getALLNotification,
  getAdminNotifications,
  getSingleNotification,
  addCustomNotification,
  viewNotification,
  deleteNotification,
  clearAllNotification,
};
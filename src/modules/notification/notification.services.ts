import { StatusCodes } from 'http-status-codes';
import { INotification } from './notification.interface';
import { Notification } from './notification.model';
import { User } from '../user/user.model';
import { PaginateOptions, PaginateResult } from '../../types/paginate';
import ApiError from '../../errors/ApiError';
import { UploaderRole } from '../attachments/attachment.constant';
import { io } from '../../server';


const addNotification = async (
  payload: INotification
): Promise<INotification> => {
  const result = await Notification.create(payload);
  return result;
};

const getALLNotification = async (
  filters: Partial<INotification>,
  options: PaginateOptions,
  userId: string
) => {
  const query: Record<string, any> = { ...filters };
  let unViewNotificationCount = 0;

  if (userId) { 
    query.receiverId = userId;
    unViewNotificationCount = await Notification.countDocuments({
      receiverId: userId,
      viewStatus: false,
    });
  }

  // We still pass the sortBy option as a fallback
  options.sortBy = 'createdAt:desc';

  const result = await Notification.paginate(query, options);

  // ✨ FINAL FIX: Manually sort the results array by date to guarantee chronological order.
  // This sorts from newest (b) to oldest (a).
  result.results.sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });
  
  return { ...result, unViewNotificationCount };
};

// ... (rest of the file is unchanged)

const getAdminNotifications = async (
  filters: Partial<INotification>,
  options: PaginateOptions
): Promise<PaginateResult<INotification>> => {
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

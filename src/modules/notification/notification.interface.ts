import { Model, Types } from 'mongoose';
import { PaginateOptions, PaginateResult } from '../../types/paginate';
import { UploaderRole } from '../attachments/attachment.constant';

export interface INotification {
  _id?: Types.ObjectId;
  receiverId?: Types.ObjectId | string;
  title: string;
  linkId?: Types.ObjectId | string;
  role: UploaderRole.projectManager | UploaderRole.projectSupervisor;
  notificationFor: {
    type: String;
    enum: ['project', 'task', 'note', 'attachment'];
    required: [true, 'notificationFor is required'];
  };
  projectId?: Types.ObjectId | undefined;
  extraInformation?: string;
  viewStatus?: boolean;
  isDeleted: Boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface INotificationModal extends Model<INotification> {
  paginate: (
    query: Record<string, any>,
    options: PaginateOptions
  ) => Promise<PaginateResult<INotification>>;
}

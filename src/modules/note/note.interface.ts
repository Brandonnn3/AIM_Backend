import { Model, Types, Document } from 'mongoose';
import { PaginateOptions, PaginateResult } from '../../types/paginate';
import { UploaderRole } from '../attachments/attachment.constant';

export interface INotification {
  _id?: Types.ObjectId;
  receiverId?: Types.ObjectId | string;
  title: string;
  linkId?: Types.ObjectId | string;
  role: UploaderRole;
  notificationFor: string;
  projectId?: Types.ObjectId;
  extraInformation?: string;
  viewStatus?: boolean;
  isDeleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface INotificationModal extends Model<INotification> {
  paginate: (
    query: Record<string, any>,
    options: PaginateOptions
  ) => Promise<PaginateResult<INotification>>;
}

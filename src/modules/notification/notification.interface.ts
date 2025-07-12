import { Model, Types } from 'mongoose';
import { PaginateOptions, PaginateResult } from '../../types/paginate';
import { UploaderRole } from '../attachments/attachment.constant';

// FIX: This interface now correctly defines the shape of a notification object.
// The schema-specific rules (like enums and required fields) belong in the .model.ts file.
export interface INotification {
  _id?: Types.ObjectId;
  receiverId?: Types.ObjectId | string;
  title: string;
  image?: string;
  linkId?: Types.ObjectId | string;
  role: UploaderRole; // Use the enum type directly
  notificationFor: string; // Use a simple string type
  projectId?: Types.ObjectId | undefined;
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

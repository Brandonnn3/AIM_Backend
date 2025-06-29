import { Model, Types } from 'mongoose';
import { PaginateOptions, PaginateResult } from '../../types/paginate';
import { noteStatus } from './note.constant';

export interface INote {
  _id?: Types.ObjectId;
  title: string;
  description : string;
  attachments: Types.ObjectId[]; // Array of ObjectId references to Attachment
  createdBy?: Types.ObjectId | string;
  dailyLogId?: Types.ObjectId | string;
  projectId?: Types.ObjectId | string; // Optional field for projectId, remove if not needed
  viewStatus?: boolean; // Optional field for viewStatus
  createdAt?: Date;
  updatedAt?: Date;
  isAccepted? : noteStatus.accepted | noteStatus.pending | noteStatus.denied;
  isDeleted : Boolean;
}

export interface INoteModel extends Model<INote> {
  paginate: (
    query: Record<string, any>,
    options: PaginateOptions
  ) => Promise<PaginateResult<INote>>;
}
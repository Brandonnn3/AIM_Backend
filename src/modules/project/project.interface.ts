import { Model, Types } from 'mongoose';
import { PaginateOptions, PaginateResult } from '../../types/paginate';
import { Status } from './project.constant';

export interface IProject {
  // _id?: Types.ObjectId;
  _projectId: undefined | Types.ObjectId;
  _id: undefined; // Types.ObjectId |
  projectName: string;
  projectLogo?: string;
  projectSuperVisorId?: Types.ObjectId | string;
  projectManagerId: Types.ObjectId | string;
  // address?: {
  streetAddress?: string;
  city?: string;
  zipCode?: string;
  country?: string;
  // };
  // deadline?: {
  startDate?: Date;
  endDate?: Date;
  // };
  attachments?: Types.ObjectId[]; // Array of ObjectId references to Attachment
  createdAt?: Date;
  updatedAt?: Date;
  dailyLogs?: [
    {
      type: Types.ObjectId;
      ref: 'DailyLog';
      required: [false, 'DailyLogs is not required'];
    }
  ];
  projectStatus: Status.completed | Status.open;
  isDeleted: Boolean;
}

export interface IProjectModel extends Model<IProject> {
  paginate: (
    query: Record<string, any>,
    options: PaginateOptions
  ) => Promise<PaginateResult<IProject>>;
}

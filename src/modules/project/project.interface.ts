import { Model, Types, Document } from 'mongoose';
import { PaginateOptions, PaginateResult } from '../../types/paginate';
import { Status } from './project.constant';

export interface IProject extends Document {
  pid: string;
  projectName: string;
  projectLogo?: string;
  projectSuperVisorIds?: Types.ObjectId[]; 
  projectManagerId: Types.ObjectId;
  streetAddress?: string;
  city?: string;
  zipCode?: string;
  country?: string;
  startDate?: Date;
  endDate?: Date;
  attachments?: Types.ObjectId[];
  projectStatus?: Status;
  isDeleted?: boolean;
}

export interface IProjectModel extends Model<IProject> {
  paginate: (
    query: Record<string, any>,
    options: PaginateOptions
  ) => Promise<PaginateResult<IProject>>;
}

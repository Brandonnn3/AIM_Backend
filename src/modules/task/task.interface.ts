import { Model, Types, Document } from 'mongoose';
import { PaginateOptions, PaginateResult } from '../../types/paginate';
import { TaskStatus } from './task.constant';

export interface ITask extends Document {
  _id: Types.ObjectId;
  task_status?: TaskStatus.complete | TaskStatus.open;
  assignedTo?: Types.ObjectId | string;
  projectId?: Types.ObjectId | string;
  dueDate?: Date;
  deadline?: Date;
  completedAt?: Date;
  title: string;
  description: string;
  attachments: Types.ObjectId[];
  createdBy: Types.ObjectId | string;
  isDeleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ITaskModel extends Model<ITask> {
  paginate(
    query: Record<string, any>,
    options: PaginateOptions
  ): Promise<PaginateResult<ITask>>;
}
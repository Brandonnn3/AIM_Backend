import { Model, Types } from 'mongoose';
import { PaginateOptions, PaginateResult } from '../../types/paginate';
import { TaskStatus } from './task.constant';

export interface ITask {
  // _taskId: undefined | Types.ObjectId;
  _id?: Types.ObjectId; // undefined |  Types.ObjectId |
  task_status?:  TaskStatus.complete | TaskStatus.done | TaskStatus.open ; // Enum for task status
  assignedTo?: Types.ObjectId | string; // Optional field, user assignment
  projectId?: Types.ObjectId | string; // Optional field, project reference
  dueDate?: Date; // Optional field for due date
  deadline?: Date; // Optional field for deadline
  completedAt?: Date; // Optional field for when task is completed
  title :string;
  description: string; // Required field for task description
  attachments: Types.ObjectId[]; // Array of ObjectId references to Attachment
  createdBy: Types.ObjectId | string; 
  isDeleted : Boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ITaskModel extends Model<ITask> {
  paginate: (
    query: Record<string, any>,
    options: PaginateOptions
  ) => Promise<PaginateResult<ITask>>;
}
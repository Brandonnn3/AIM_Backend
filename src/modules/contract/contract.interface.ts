import { Model, Types } from 'mongoose';
import { PaginateOptions, PaginateResult } from '../../types/paginate';
import { CreatorRole } from './contract.constant';

export interface IContract {
  attachments: Types.ObjectId[];
  description: string;
  projectId?: Types.ObjectId | string;
  createdBy?: Types.ObjectId | string;
  creatorRole?: CreatorRole.projectManager | CreatorRole.projectSupervisor
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IContractModel extends Model<IContract> {
  paginate: (
    query: Record<string, any>,
    options: PaginateOptions
  ) => Promise<PaginateResult<IContract>>;
}
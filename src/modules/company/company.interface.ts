import { Model, Types } from 'mongoose';
import { PaginateOptions, PaginateResult } from '../../types/paginate';

export interface ICompany {
  _id?: Types.ObjectId;
  name: string;
}

export interface ICompanyModel extends Model<ICompany> {
  paginate: (
    query: Record<string, any>,
    options: PaginateOptions
  ) => Promise<PaginateResult<ICompany>>;
}

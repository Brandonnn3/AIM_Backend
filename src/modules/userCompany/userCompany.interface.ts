import { Model, Types, Document } from 'mongoose';
import { PaginateOptions, PaginateResult } from '../../types/paginate';

export interface IUserCompany extends Document { // Renamed for clarity
  userId: Types.ObjectId;
  companyId: Types.ObjectId;
  role: string; // FIX: Add the missing 'role' property
}

export interface IUserCompanyModel extends Model<IUserCompany> { // Renamed for clarity
  paginate(
    query: Record<string, any>,
    options: PaginateOptions
  ): Promise<PaginateResult<IUserCompany>>;
}
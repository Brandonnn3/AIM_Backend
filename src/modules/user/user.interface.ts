import { Document, Model, Types } from 'mongoose';
import { Role } from '../../middlewares/roles';
import { IMaritalStatus, TGender, TUserStatus } from './user.constant';
import { PaginateOptions, PaginateResult } from '../../types/paginate';

export type TProfileImage = {
  imageUrl: string;
};

export type TPhotoGallery = {
  imageUrl: string;
  file: Record<string, any>;
};

export type TUser = {
  _userId: undefined | Types.ObjectId;
  _id:  undefined; 
  fname: string;
  lname: string;
  email: string;
  password: string;
  profileImage?: TProfileImage;
  fcmToken : string | null;
  address: string;
  companyName : string;
  role: Role;
  
  // ADDED THIS LINE to match the logic in auth.service.ts
  companyId?: Types.ObjectId | null; 
  
  superVisorsManagerId?: Types.ObjectId | null;
  isEmailVerified: boolean;
  phoneNumber : string;
  isDeleted: boolean;
  lastPasswordChange: Date;
  isResetPassword: boolean;
  isPasswordTemporary?: boolean;
  failedLoginAttempts: number;
  lockUntil: Date | undefined;
  createdAt: Date;
  updatedAt: Date;
};

export interface UserModal extends Model<TUser> {
  paginate: (
    filter: object,
    options: PaginateOptions,
  ) => Promise<PaginateResult<TUser>>;
  isExistUserById(id: string): Promise<Partial<TUser> | null>;
  isExistUserByEmail(email: string): Promise<Partial<TUser> | null>;
  isMatchPassword(password: string, hashPassword: string): Promise<boolean>;
}
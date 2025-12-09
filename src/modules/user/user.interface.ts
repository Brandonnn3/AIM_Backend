import { Document, Model, Types } from 'mongoose';
import { Role } from '../../middlewares/roles';
import { PaginateOptions, PaginateResult } from '../../types/paginate';

export type TProfileImage = {
  imageUrl: string;
};

// ✨ FIX: Changed TUser to be an interface that extends Mongoose's Document.
// This ensures that properties like _id are correctly typed and available.
export interface TUser extends Document {
  fname: string;
  lname: string;
  email: string;
  password: string;
  profileImage?: TProfileImage;
  fcmToken : string | null;
  address: string;
  companyName : string;
  role: Role;
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
  subscriptionPlan?: 'freeTrial' | 'monthly' | 'yearly' | 'none';
  subscriptionStatus?: 'trial' | 'active' | 'expired' | 'canceled' | 'none';
  subscriptionTrialEnd?: Date | null;
  subscriptionCurrentPeriodEnd?: Date | null;
  subscriptionOwnerUserId?: Types.ObjectId | string | null;
  appleOriginalTransactionId?: string | null;
  appleLatestTransactionId?: string | null;
}

export interface UserModal extends Model<TUser> {
  paginate: (
    filter: object,
    options: PaginateOptions,
  ) => Promise<PaginateResult<TUser>>;
  isExistUserById(id: string): Promise<Partial<TUser> | null>;
  isExistUserByEmail(email: string): Promise<Partial<TUser> | null>;
  isMatchPassword(password: string, hashPassword: string): Promise<boolean>;
}

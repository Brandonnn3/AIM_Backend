import { StatusCodes } from 'http-status-codes';
import ApiError from '../../errors/ApiError';
import { PaginateOptions, PaginateResult } from '../../types/paginate';
import { TUser } from './user.interface';
import { User } from './user.model';
import { sendAdminOrSuperAdminCreationEmail } from '../../helpers/emailService';

import { Project } from '../project/project.model';
import { CreatorRole } from '../contract/contract.constant';
import { GenericService } from '../Generic Service/generic.services';

interface IAdminOrSuperAdminPayload {
  email: string;
  password: string;
  role: string;
  message?: string;
}


export class UserCustomService extends GenericService<typeof User> {
    constructor() {
        super(User);
    }
    
}

const createAdminOrSuperAdmin = async (
  payload: IAdminOrSuperAdminPayload
): Promise<TUser> => {
  const existingUser = await User.findOne({ email: payload.email });
  if (existingUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'This email already exists');
  }
  const result = new User({
    first_name: 'New',
    last_name: ` ${payload.role === 'admin' ? 'Admin' : 'Super Admin'}`,
    email: payload.email,
    password: payload.password,
    role: payload.role,
  });

  await result.save();
  //send email for the new admin or super admin via email service
  // todo
  sendAdminOrSuperAdminCreationEmail(
    payload.email,
    payload.role,
    payload.password,
    payload.message
  );

  return result;
};
const getAllUsers = async (
  filters: Record<string, any>,
  options: PaginateOptions
): Promise<PaginateResult<TUser>> => {
  const query: Record<string, any> = {};
  if (filters.userName) {
    query['first_name'] = { $regex: filters.userName, $options: 'i' };
  }
  if (filters.email) {
    query['email'] = { $regex: filters.email, $options: 'i' };
  }
  if (filters.role) {
    query['role'] = filters.role;
  }
  return await User.paginate(query, options);
};

const getFilteredUsersWithConnectionStatus = async (
  userId: string,
  filters: Record<string, any>,
  options: PaginateOptions
) => {
  const query: Record<string, any> = {
    role: { $in: ['mentor', 'mentee'] }, 
  };

  if (filters.userName) {
    query['first_name'] = { $regex: filters.userName, $options: 'i' };
  }
  if (filters.email) {
    query['email'] = { $regex: filters.email, $options: 'i' };
  }
  if (filters.role) {
    query['role'] = filters.role;
  }

  options.populate = [
    {
      path: 'connections',
      match: { senderId: userId }
    },
  ]
  // Fetch users with pagination
  const usersResult = await User.paginate(query, options);

  return usersResult;
};

const getSingleUser = async (userId: string): Promise<TUser | null> => {
  const result = await User.findById(userId);
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }
  return result;
};

const updateMyProfile = async (
  userId: string,
  payload: Partial<TUser>
): Promise<TUser | null> => {
  const result = await User.findByIdAndUpdate(userId, payload, { new: true });
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }
  return result;
};

const updateUserStatus = async (
  userId: string,
  payload: Partial<TUser>
): Promise<TUser | null> => {
  const result = await User.findByIdAndUpdate(userId, payload, { new: true });
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }
  return result;
};
const updateUserProfile = async (
  userId: string,
  payload: Partial<TUser>
): Promise<TUser | null> => {
  const result = await User.findByIdAndUpdate(userId, payload, { new: true });
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }
  return result;
};

const updateProfileImage = async (
  userId: string,
  payload: Partial<TUser>
): Promise<TUser | null> => {
  const result = await User.findByIdAndUpdate(userId, payload, { new: true });
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }
  return result;
};

const getMyProfile = async (userId: string): Promise<TUser | null> => {
  const result = await User.findById(userId);
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }
  return result;
};
const deleteMyProfile = async (userId: string): Promise<TUser | null> => {
  const result = await User.findById(userId);
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }
  result.isDeleted = true;
  await result.save();
  return result;
};

///////////////////////////////////////////////////////

const getAllProjectsByUserId = async (userId: string) => {
 
  const user = await User.findById(userId);
 
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }
  let result ;
  if(user.role == CreatorRole.projectManager){
    
    result = await Project.find({ projectManagerId: user._id });
    
    console.log("result 🚀1", result);
  }else{
    result = await Project.find({ projectSuperVisorId: user._id });
    console.log("result 🚀2", result);
  }
  return user;
};


export const UserService = {
  createAdminOrSuperAdmin,
  getAllUsers,
  getSingleUser,
  updateMyProfile,
  updateUserStatus,
  updateUserProfile,
  getFilteredUsersWithConnectionStatus,
  getMyProfile,
  updateProfileImage,
  deleteMyProfile,
  //////////////////////////
  getAllProjectsByUserId
};
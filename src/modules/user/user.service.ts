import { StatusCodes } from 'http-status-codes';
import ApiError from '../../errors/ApiError';
import { PaginateOptions, PaginateResult } from '../../types/paginate';
import { TUser } from './user.interface';
import { User } from './user.model';
import { sendAdminOrSuperAdminCreationEmail, sendSupervisorInviteEmail } from '../../helpers/emailService';
import { Project } from '../project/project.model';
import { CreatorRole } from '../contract/contract.constant';
import { GenericService } from '../Generic Service/generic.services';
import { UserCompany } from '../userCompany/userCompany.model';
import { CompanyService } from '../company/company.service';
import { logger } from '../../shared/logger';

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

const getSupervisorsByManager = async (managerId: string): Promise<TUser[]> => {
  const supervisors = await User.find({
    role: 'projectSupervisor',
    superVisorsManagerId: managerId,
  }).select('-password'); 

  return supervisors;
};


const inviteSupervisors = async (
  emails: string[],
  invitingManager: any // This is the decoded token payload
): Promise<{ successfulInvites: TUser[]; failedInvites: { email: string; reason: string }[] }> => {
  const companyService = new CompanyService();
  const successfulInvites: TUser[] = [];
  const failedInvites: { email: string; reason: string }[] = [];

  // ✅ DEFINITIVE FIX: Use `userId` from the token payload.
  const managerCompanyLink = await UserCompany.findOne({ userId: invitingManager.userId });
  if (!managerCompanyLink) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Inviting manager is not associated with a company.');
  }
  const companyId = managerCompanyLink.companyId;

  for (const email of emails) {
    try {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        failedInvites.push({ email, reason: 'Email already exists in the system.' });
        continue;
      }

      const tempPassword = Math.random().toString(36).slice(-8);
      const newSupervisor = new User({
        email,
        password: tempPassword,
        role: 'projectSupervisor',
        isEmailVerified: true,
        isPasswordTemporary: true,
        superVisorsManagerId: invitingManager.userId,
        companyId: companyId,
        fname: 'New',
        lname: 'Supervisor',
        address: '',
        companyName: invitingManager.userName, // Use userName from token
        phoneNumber: '',
      });

      const savedSupervisor = await newSupervisor.save();

      await companyService.joinCompany(savedSupervisor, companyId!.toString());
      
      await sendSupervisorInviteEmail(email, invitingManager.userName, tempPassword);

      successfulInvites.push(savedSupervisor);

    } catch (error) {
        logger.error(`Failed to process invite for ${email}:`, error);
        failedInvites.push({ email, reason: 'An internal error occurred.' });
    }
  }

  return { successfulInvites, failedInvites };
};

const cancelSupervisorInvitation = async (supervisorId: string, managerId: string): Promise<void> => {
  const supervisor = await User.findById(supervisorId);

  if (!supervisor) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Supervisor not found.');
  }

  if (supervisor.superVisorsManagerId?.toString() !== managerId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You are not authorized to perform this action.');
  }
  if (!supervisor.isPasswordTemporary) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'This supervisor is already an active user and cannot be canceled.');
  }

  await UserCompany.deleteOne({ userId: supervisorId });
  await User.findByIdAndDelete(supervisorId);
};

const removeSupervisorFromCompany = async (supervisorId: string, managerId: string): Promise<void> => {
    const supervisor = await User.findById(supervisorId);

    if (!supervisor) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Supervisor not found.');
    }

    if (supervisor.superVisorsManagerId?.toString() !== managerId) {
        throw new ApiError(StatusCodes.FORBIDDEN, 'This supervisor does not belong to your company.');
    }

    await User.findByIdAndUpdate(supervisorId, {
        $unset: { superVisorsManagerId: 1 }
    });

    await UserCompany.deleteOne({ userId: supervisorId });
};


const createAdminOrSuperAdmin = async (
  payload: IAdminOrSuperAdminPayload
): Promise<TUser> => {
  const existingUser = await User.findOne({ email: payload.email });
  if (existingUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'This email already exists');
  }
  const result = new User({
    fname: 'New',
    lname: ` ${payload.role === 'admin' ? 'Admin' : 'Super Admin'}`,
    email: payload.email,
    password: payload.password,
    role: payload.role,
  });

  await result.save();
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
    query['fname'] = { $regex: filters.userName, $options: 'i' };
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
    query['fname'] = { $regex: filters.userName, $options: 'i' };
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

const getAllProjectsByUserId = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }
  let result ;
  if(user.role == CreatorRole.projectManager){
    result = await Project.find({ projectManagerId: user._id });
  }else{
    result = await Project.find({ projectSuperVisorId: user._id });
  }
  return result;
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
  getAllProjectsByUserId,
  inviteSupervisors,
  getSupervisorsByManager,
  cancelSupervisorInvitation,
  removeSupervisorFromCompany,
};

import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../shared/catchAsync';
import pick from '../../shared/pick';
import sendResponse from '../../shared/sendResponse';
import ApiError from '../../errors/ApiError';
import { UserCustomService, UserService } from './user.service';
import { User } from './user.model';
import { Types, Schema, model, Document } from 'mongoose'; // Added Document import
import { AttachmentService } from '../attachments/attachment.service';
import { FolderName } from '../../enums/folderNames';
import { AttachedToType } from '../attachments/attachment.constant';
import { UserCompany } from '../userCompany/userCompany.model';
import { TUser } from '../user/user.interface';
// import { Connection } from '../connection/connection.model'; // Removed the import to avoid the error

// --- Temporary fix for missing Connection model ---
// In a full project, this would be in its own file.
// This defines the schema for the connection collection.
interface IConnection extends Document {
  senderId: Types.ObjectId;
  receiverId: Types.ObjectId;
  status: string;
}

const connectionSchema = new Schema<IConnection>({
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, required: true },
});

const Connection = model<IConnection>('connections', connectionSchema);


const userCustomService = new UserCustomService();
const attachmentService = new AttachmentService();

const getMySupervisors = catchAsync(async (req, res) => {
  const manager = req.user as any; // This is the decoded token payload

  // Use userId from the token
  if (!manager || !manager.userId) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Manager not authenticated.');
  }

  const result = await UserService.getSupervisorsByManager(manager.userId);
  
  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'Supervisors retrieved successfully.',
  });
});

const inviteSupervisors = catchAsync(async (req, res) => {
  const invitingManager = req.user as any;
  const { emails } = req.body;

  if (!invitingManager || !invitingManager.userId) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'You must be logged in to send invites.');
  }

  // Pass the full user payload to the service
  const result = await UserService.inviteSupervisors(emails, invitingManager);
  
  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'Supervisor invitations processed successfully.',
  });
});

const cancelSupervisorInvitation = catchAsync(async (req, res) => {
  const supervisorId = req.params.id;
  const manager = req.user as any;

  await UserService.cancelSupervisorInvitation(supervisorId, manager.userId);

  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Supervisor invitation canceled successfully.',
  });
});

const removeSupervisorFromCompany = catchAsync(async (req, res) => {
    const supervisorId = req.params.id;
    const manager = req.user as any;

    await UserService.removeSupervisorFromCompany(supervisorId, manager.userId);

    sendResponse(res, {
        code: StatusCodes.OK,
        message: 'Supervisor removed from company successfully.',
    });
});


const createAdminOrSuperAdmin = catchAsync(async (req, res) => {
  const payload = req.body;
  const result = await UserService.createAdminOrSuperAdmin(payload);
  sendResponse(res, {
    code: StatusCodes.CREATED,
    data: result,
    message: `${
      payload.role === 'admin' ? 'Admin' : 'Super Admin'
    } created successfully`,
  });
});

/**
 * Retrieves all users with pagination, manually merging connection statuses
 * to be compatible with DocumentDB's aggregation limitations.
 */
const getAllUsers = catchAsync(async (req, res) => {
  const user = req.user as any;
  const currentUserId = new Types.ObjectId(user.userId);
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  // --- STEP 1: Fetch users first (without connection details) ---
  // Using .lean() for faster processing
  const users = await User.find({
    isDeleted: false,
    _id: { $ne: currentUserId }, // Exclude current user from list
  })
  .select('-password -isDeleted -failedLoginAttempts -lockUntil')
  .skip(skip)
  .limit(limit)
  .lean();

  const userIds = users.map(u => u._id);

  // --- STEP 2: Fetch connection statuses for these users in a separate query ---
  const connections = await Connection.find({
    $or: [
      { senderId: { $in: userIds }, receiverId: currentUserId },
      { senderId: currentUserId, receiverId: { $in: userIds } },
    ],
  }).lean();

  // --- STEP 3: Map connections to a more usable format ---
  const connectionStatusMap = new Map();
  connections.forEach((conn: IConnection) => {
    let targetUserId;
    if (conn.senderId.equals(currentUserId)) {
      targetUserId = conn.receiverId.toString();
    } else {
      targetUserId = conn.senderId.toString();
    }
    connectionStatusMap.set(targetUserId, conn.status);
  });

  // --- STEP 4: Manually merge connection status into each user object ---
  const usersWithConnectionStatus = users.map((user: any) => { // User might not have connections so must be any
    const status = connectionStatusMap.get(user._id.toString()) || 'not-connected';
    return {
      ...user,
      connectionStatus: status === 'accepted' ? 'connected' : status,
    };
  });

  // Count total users for pagination metadata
  const total = await User.countDocuments({
    _id: { $ne: currentUserId },
    isDeleted: false,
  });

  res.json({
    data: usersWithConnectionStatus,
    meta: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  });
});

const getSingleUser = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const result = await UserService.getSingleUser(userId);
  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'User fetched successfully',
  });
});

const updateProfile = catchAsync(async (req, res) => {
  const { userId } = req.params;
  
  if (!userId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'User ID is required.');
  }

  if (req.file) {
    const attachmentResult = await attachmentService.uploadSingleAttachment(
      req.file,
      FolderName.user,
      req.user as any,
      'user'
    );

    req.body.profileImage = {
      imageUrl: attachmentResult.attachment,
    };
  }

  const result = await UserService.updateMyProfile(userId, req.body);
  
  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'Profile updated successfully',
  });
});

const updateProfileImage = catchAsync(async (req, res) => {
  const user = req.user as any;
  if (!user || !user.userId) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'You are unauthenticated.');
  }
  if (req.file) {
    const attachmentResult = await attachmentService.uploadSingleAttachment(
      req.file,
      FolderName.user,
      user,
      'user'
    );

    req.body.profileImage = {
      imageUrl: attachmentResult.attachment,
    };
  }
  const result = await UserService.updateMyProfile(user.userId, req.body);
  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'Profile image updated successfully',
  });
});

const updateMyProfile = catchAsync(async (req, res) => {
  const user = req.user as any;
  if (!user || !user.userId) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'You are unauthenticated.');
  }
  if (req.file) {
    req.body.profile_image = {
      imageUrl: '/uploads/users/' + req.file.filename,
      file: req.file,
    };
  }
  const result = await UserService.updateMyProfile(user.userId, req.body);
  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'User updated successfully',
  });
});

const updateUserStatus = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const payload = req.body;
  const result = await UserService.updateUserStatus(userId, payload);
  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'User status updated successfully',
  });
});

const updateUserProfile = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const payload = req.body;
  const result = await UserService.updateUserProfile(userId, payload);
  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'User updated successfully',
  });
});

const getMyProfile = catchAsync(async (req, res) => {
  const user = req.user as any;
  if (!user || !user.userId) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'You are unauthenticated.');
  }
  const result = await UserService.getMyProfile(user.userId);
  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'User fetched successfully',
  });
});
const deleteMyProfile = catchAsync(async (req, res) => {
  const user = req.user as any;
  if (!user || !user.userId) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'You are unauthenticated.');
  }
  const result = await UserService.deleteMyProfile(user.userId);
  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'User deleted successfully',
  });
});

const getAllProjectsByUserId = catchAsync(async (req, res) => {
  const user = req.user as any;
  if (!user || !user.userId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'User ID not found in request');
  }
  const result = await UserService.getAllProjectsByUserId(user.userId);

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'No Projects found');
  }

  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'All Project By User Id ',
  });
});

const getAllUserWithPagination = catchAsync(async (req, res) => {
  const filters = pick(req.query, ['_id', 'role', 'fname', 'lname']);
  const options = pick(req.query, ['sortBy', 'limit', 'page', 'populate']);

  const result = await userCustomService.getAllWithPagination(filters, options);

  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'All tasks with Pagination',
  });
});

const getAllManager = catchAsync(async (req, res) => {
  const result = await User.find({ role: 'projectManager' }).select(
    'fname lname'
  );
  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'All Manager',
  });
});

const getAllManagerByCompanyId = catchAsync(async (req, res) => {
  if (!req.query.companyId) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Company ID not found in request'
    );
  }
  const result = await UserCompany.find({
    companyId: req.query.companyId,
    role: 'projectManager',
  }).populate({
    path: 'userId',
    select: 'fname lname',
  });
  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'All Manager',
  });
});

const getAllProjectSupervisorsByProjectManagerId = catchAsync(
  async (req, res) => {
    const user = req.user as any;
    const result = await User.find({
      role: 'projectSupervisor',
      superVisorsManagerId: user.userId,
    }).select('');
    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'All Supervisors',
    });
  }
);

export const UserController = {
  createAdminOrSuperAdmin,
  getAllUsers,
  getSingleUser,
  updateMyProfile,
  updateProfile,
  updateProfileImage,
  updateUserStatus,
  getMyProfile,
  updateUserProfile,
  deleteMyProfile,
  getAllProjectsByUserId,
  getAllUserWithPagination,
  getAllManager,
  getAllProjectSupervisorsByProjectManagerId,
  getAllManagerByCompanyId,
  inviteSupervisors,
  getMySupervisors,
  cancelSupervisorInvitation,
  removeSupervisorFromCompany,
};

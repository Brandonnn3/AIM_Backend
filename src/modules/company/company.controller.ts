import catchAsync from '../../shared/catchAsync';
import sendResponse from '../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../errors/ApiError';
import { CompanyService } from './company.service';
import { Company } from './company.model';
import { NotificationService } from '../notification/notification.services';
// 🔹 ADDED: Required for image uploads
import { AttachmentService } from '../attachments/attachment.service';
import { FolderName } from '../../enums/folderNames'; 

const companyService = new CompanyService();
const attachmentService = new AttachmentService();

const getMyCompany = catchAsync(async (req, res) => {
  const user = req.user as any;
  const result = await companyService.getCompanyByManagerId(user.userId);
  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'Company details retrieved successfully',
    success: true,
  });
});

const createCompany = catchAsync(async (req, res) => {
  if(req.body.name === ""){
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Company name is required');
  }
  const existingCompany = await Company.findOne({
    name: { $regex: new RegExp(req.body.name, 'i') },
  });

  if (existingCompany) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Company already exists');
  } else {
    const result = await companyService.create(req.body);
    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Company created successfully',
      success: true,
    });
  }
});

const getACompanyByName = catchAsync(async (req, res) => {
  const companyName = req.query.companyName;
  if (typeof companyName !== 'string' || companyName === "") {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Company name is required and must be a string.');
  }
  
  const result = await Company.find({
    name: { $regex: new RegExp(companyName, 'i') },
  });

  if (result.length === 0) {
    return sendResponse(res, {
      code: StatusCodes.OK,
      data: [],
      message: 'No companies found with that name.',
      success: true,
    });
  }
  
  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'Company retrieved successfully',
    success: true,
  });
});

const getAllCompany = catchAsync(async (req, res) => {
  const result = await companyService.getAll();
  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'All Companies retrieved successfully',
    success: true,
  });
});

// 🔹 MODIFIED: Now handles file uploads via req.file
const updateById = catchAsync(async (req, res) => {
  const user = req.user as any;
  const { companyId } = req.params;

  // New Logic: If a file is uploaded, process it and add URL to body
  if (req.file) {
    const attachmentResult = await attachmentService.uploadSingleAttachment(
      req.file,
      FolderName.company, // Ensure 'company' is in your FolderName enum
      user,
      'company'
    );
    req.body.logo = attachmentResult.attachment; 
  }

  const result = await companyService.updateCompanyById(
    companyId,
    req.body,
    user.userId
  );

  if (result && user?.userId) {
    const notificationPayload = {
      title: `Company profile for '${result.name}' was updated.`,
      receiverId: user.userId,
      notificationFor: 'company',
      role: user.role,
    };
    await NotificationService.addNotification(notificationPayload as any);
  }

  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'Company updated successfully',
    success: true,
  });
});

const deleteById = catchAsync(async (req, res) => {
  await companyService.deleteById(req.params.companyId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Company deleted successfully',
    success: true,
  });
});

const joinCompany = catchAsync(async (req, res) => {
  const user = req.user as any;
  const { companyId } = req.body;

  if (!user) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated.');
  }
  if (!companyId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Company ID is required.');
  }

  const result = await companyService.joinCompany(user, companyId);
  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'Successfully joined the company.',
    success: true,
  });
});

const setupCompanyProfile = catchAsync(async (req, res) => {
    const user = req.user as any;
    const companyProfileData = req.body;

    if (!user) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated.');
    }

    const result = await companyService.setupCompanyProfile(companyProfileData, user);

    sendResponse(res, {
        code: StatusCodes.CREATED,
        data: result,
        message: 'Company profile created and user joined successfully.',
        success: true,
    });
});

export const CompanyController = {
  getAllCompany,
  getACompanyByName,
  createCompany,
  updateById,
  deleteById,
  joinCompany,
  setupCompanyProfile,
  getMyCompany,
};
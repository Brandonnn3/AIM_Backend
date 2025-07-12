import catchAsync from '../../shared/catchAsync';
import sendResponse from '../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';
import pick from '../../shared/pick';
import { ContractService } from './contract.service';
import ApiError from '../../errors/ApiError';
import { AttachmentService } from '../attachments/attachment.service';
import { FolderName } from '../../enums/folderNames';
import { AttachedToType } from '../attachments/attachment.constant';
import { TUser } from '../user/user.interface';

const contractService = new ContractService();
const attachmentService = new AttachmentService();

const createContract = catchAsync(async (req, res) => {
  const user = req.user as TUser;

  if (user.role !== 'projectManager') {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Only Project Manager can access this.'
    );
  }

  // FIX: Type assertion and proper check for req.files
  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

  if (!files || !files.attachments) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Attachment is required.'
    );
  }

  if (user._userId) {
    req.body.createdBy = user._userId;
    req.body.creatorRole = 'projectManager';
  }

  let attachments: string[] = [];
  
  if (files && files.attachments) {
    attachments = await Promise.all(
      files.attachments.map(async (file: Express.Multer.File) => {
        const attachmenId = await attachmentService.uploadSingleAttachment(
          file,
          FolderName.aimConstruction,
          req.body.projectId,
          user,
          AttachedToType.contract
        );
        return attachmenId;
      })
    );
  }
 
  req.body.attachments = attachments;

  const result = await contractService.create(req.body);

  if (attachments.length > 0) {
    await Promise.all(
      attachments.map(async (attachmentId: string) => { // Added type
        await attachmentService.updateById(
          attachmentId,
          // FIX: Cast to 'any' to solve property mismatch
          {
            attachedToId: result._id,
          } as any
        );
      })
    );
  }
  
  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'Contract created successfully',
    success: true,
  });
});

const getAContract = catchAsync(async (req, res) => {
  const result = await contractService.getById(req.params.contractId);
  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'Contract retrieved successfully',
    success: true,
  });
});

const getAllContract = catchAsync(async (req, res) => {
  const result = await contractService.getAll();
  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'All Contracts',
    success: true,
  });
});

const getAllContractWithPagination = catchAsync(async (req, res) => {
  const filters = pick(req.query, [ '_id', 'projectId']);
  const options = pick(req.query, ['sortBy', 'limit', 'page', 'populate']);

  options.populate = [
    {
      path: "attachments",
      select: "-__v -attachedToId -updatedAt -createdAt -reactions -uploaderRole -uploadedByUserId -projectId -attachedToType -attachmentType",
    }
  ];

  const result = await contractService.getAllWithPagination(filters, options);

  // FIX: Add explicit type to date parameter and options object
  const formatDate = (date: any) => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(date).toLocaleDateString('en-US', options);
  };

  // FIX: Add explicit types to reduce parameters
  const groupedByDate = result.results.reduce((acc: any, attachment: any) => {
    const dateKey = formatDate(attachment.createdAt);
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(attachment);
    return acc;
  }, {});

  const result1 = Object.keys(groupedByDate).map((date: any) => ({
    date: date,
    attachments: groupedByDate[date]
  }));

  sendResponse(res, {
    code: StatusCodes.OK,
    data: result1,
    message: 'All Contracts with Pagination',
    success: true,
  });
});

const updateById = catchAsync(async (req, res) => {
  const result = await contractService.updateById(
    req.params.contractId,
    req.body
  );
  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'Contract updated successfully',
    success: true,
  });
});

const deleteById = catchAsync(async (req, res) => {
  await contractService.deleteById(req.params.contractId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Contract deleted successfully',
    success: true,
  });
});

export const ContractController = {
  createContract,
  getAllContract,
  getAllContractWithPagination,
  getAContract,
  updateById,
  deleteById,
};
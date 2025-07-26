import catchAsync from '../../shared/catchAsync';
import sendResponse from '../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';
import pick from '../../shared/pick';
import { ContractService } from './contract.service';
import ApiError from '../../errors/ApiError';
import { AttachmentService } from '../attachments/attachment.service';
import { TUser } from '../user/user.interface';
import { NotificationService } from '../notification/notification.services';
import { Project } from '../project/project.model';
import { Types } from 'mongoose';
import { INotification } from '../notification/notification.interface';

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

  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

  if (!files || !files.attachments) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Attachment is required.'
    );
  }

  if (user._id) {
    req.body.createdBy = user._id;
    req.body.creatorRole = user.role;
  }

  let attachments: string[] = [];
  
  if (files && files.attachments) {
    attachments = await Promise.all(
      files.attachments.map(async (file: Express.Multer.File) => {
        const newAttachment = await attachmentService.uploadAndCreateAttachment(
          file,
          {
            projectId: req.body.projectId,
            user,
            attachedToType: 'contract',
            customName: file.originalname,
          }
        );
        return newAttachment._id.toString();
      })
    );
  }
 
  req.body.attachments = attachments;

  const result = await contractService.create(req.body);

  if (attachments.length > 0) {
    await Promise.all(
      attachments.map(async (attachmentId: string) => {
        await attachmentService.updateById(
          attachmentId,
          {
            attachedToId: result._id,
          } as any
        );
      })
    );
  }
  
  // ✨ ADD THIS BLOCK TO CREATE AN ACTIVITY RECORD ✨
  const project = await Project.findById(req.body.projectId).select('projectName projectManagerId');
  if (project && project.projectManagerId) {
    const uploaderName = user.fname ? `${user.fname} ${user.lname}` : 'A manager';
    const notificationPayload: INotification = {
      title: `New Contract uploaded for '${project.projectName}' by ${uploaderName}.`,
      receiverId: project.projectManagerId,
      notificationFor: 'contract',
      projectId: project._id as Types.ObjectId,
      linkId: result._id,
      role: 'projectManager' as any,
      isDeleted: false,
    };
    await NotificationService.addNotification(notificationPayload);
  }
  // ✨ END OF BLOCK ✨

  sendResponse(res, {
    code: StatusCodes.CREATED,
    data: result,
    message: 'Contract created successfully',
    success: true,
  });
});

// --- NO CHANGES TO OTHER FUNCTIONS ---

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

  const groupedByDate = result.results.reduce((acc: any, contract: any) => {
    const dateKey = new Date(contract.createdAt).toISOString().split('T')[0];
    
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(contract);
    return acc;
  }, {});

  const finalResult = Object.keys(groupedByDate).map((date: string) => ({
    date: date,
    attachments: groupedByDate[date]
  }));

  sendResponse(res, {
    code: StatusCodes.OK,
    data: finalResult,
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


import catchAsync from '../../shared/catchAsync';
import sendResponse from '../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';
import pick from '../../shared/pick';
import { ContractService } from './contract.service';
import ApiError from '../../errors/ApiError';
import { AttachmentService } from '../attachments/attachment.service';
import { FolderName } from '../../enums/folderNames';
import { AttachedToType } from '../attachments/attachment.constant';


const contractService = new ContractService();
const attachmentService = new AttachmentService();


//[🚧][🧑‍💻✅][🧪🆗]
const createContract = catchAsync(async (req, res) => {
  if (req.user.role !== 'projectManager') {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Only Project Manager can access this.'
    );
  }
  if(!req.files.attachments){
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Attachment is required.'
    );
  }

  if (req.user.userId) {
    req.body.createdBy = req.user.userId;
    req.body.creatorRole = 'projectManager';
  }

    let attachments = [];
    
      if (req.files && req.files.attachments) {
        attachments.push(
          ...(await Promise.all(
            req.files.attachments.map(async file => {
              const attachmenId = await attachmentService.uploadSingleAttachment(
                file,
                FolderName.aimConstruction,
                req.body.projectId,
                req.user,
                AttachedToType.contract // TODO : eta add korte hobe .. but make sure korte hobe .. ei document jeno manager chara ar keo dekhte na pare 
              ); // FIXME  : make sure korte hobe .. ei document jeno manager chara ar keo dekhte na pare  
              return attachmenId;
            })
          ))
        );
      }
  
      req.body.attachments = attachments;

  const result = await contractService.create(req.body);


  if (attachments.length > 0) {
    await Promise.all(
      attachments.map(async attachmentId => {
        // Assuming you have a service or model method to update the attachment's attachedToId and attachedToType
        await attachmentService.updateById(
          attachmentId, // Pass the attachment ID
          {
            attachedToId: result._id,
          }
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
  const filters = pick(req.query, [ '_id', 'projectId']); // 'projectName',
  const options = pick(req.query, ['sortBy', 'limit', 'page', 'populate']);

  options.populate = [
    // {
    //   path: "assignedTo",
    //   // match: isPreviewFilter,
    //   select: " -createdAt -updatedAt -__v -failedLoginAttempts -isDeleted -isResetPassword -isEmailVerified -isDeleted -superVisorsManagerId -role -fcmToken -profileImage -email ", //-audioFile
    //   // populate: {
    //   //   path: "languageId",
    //   //   select: "-createdAt -updatedAt -__v",
    //   // },
    // },
    {
      path: "attachments",
      select: "-__v -attachedToId -updatedAt -createdAt -reactions -uploaderRole -uploadedByUserId -projectId -attachedToType -attachmentType", // -createdAt -updatedAt
    }
  ];

  const result = await contractService.getAllWithPagination(filters, options);

 
  // Helper function to format date as "Sunday, February 23, 2025"
  const formatDate = (date) => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(date).toLocaleDateString('en-US', options);
  };

  // Group attachments by date
  const groupedByDate = result.results.reduce((acc, attachment) => {
    //const dateKey = extractDate(attachment.createdAt); // Extract YYYY-MM-DD
    const dateKey = formatDate(attachment.createdAt);
    if (!acc[dateKey]) {
      acc[dateKey] = []; // Initialize array for the date
    }
    acc[dateKey].push(attachment); // Add the attachment to the corresponding date
    return acc;
  }, {});

  // console.log('Grouped by Date:', groupedByDate);

  // Transform into the desired output format
  const result1 = Object.keys(groupedByDate).map((date) => ({
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

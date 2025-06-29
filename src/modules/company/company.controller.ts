
import catchAsync from '../../shared/catchAsync';
import sendResponse from '../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';
import pick from '../../shared/pick';
import ApiError from '../../errors/ApiError';
import { AttachmentService } from '../attachments/attachment.service';
import { FolderName } from '../../enums/folderNames';
import { AttachedToType } from '../attachments/attachment.constant';
import { CompanyService } from './company.service';
import { Company } from './company.model';

const companyService = new CompanyService();


//[🚧][🧑‍💻✅][🧪🆗]
const createCompany = catchAsync(async (req, res) => {
  // check if the company name already exists ... 

  if(req.body.name === ""){
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Company name is required');
  }

  // Use $regex for partial matching (case-insensitive)
  const existingCompany = await Company.findOne({
    name: { $regex: new RegExp(req.body.name, 'i') }, // 'i' makes it case-insensitive
  });

  if (existingCompany) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Company already exists');
  }else{
    const result = await companyService.create(req.body);

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Company created successfully',
      success: true,
    });
  }
});

//[🚧][🧑‍💻✅][🧪🆗]
const getACompanyByName = catchAsync(async (req, res) => {
  if(req.query.companyName === ""){
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Company name is required');
  }
  const result = await Company.find({
    name: { $regex: new RegExp(req?.query?.companyName, 'i') }, // 'i' makes it case-insensitive
  });


  if (result.length === 0) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Company not found');
  }

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Company not found');
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


const updateById = catchAsync(async (req, res) => {
  const result = await companyService.updateById(
    req.params.contractId,
    req.body
  );
  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'Company updated successfully',
    success: true,
  });
});

const deleteById = catchAsync(async (req, res) => {
  await companyService.deleteById(req.params.contractId);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Company deleted successfully',
    success: true,
  });
});

export const CompanyController = {
  getAllCompany,
  getACompanyByName,
  createCompany,
  updateById,
  deleteById,
};

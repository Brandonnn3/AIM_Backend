// import { StatusCodes } from 'http-status-codes';
// import catchAsync from '../../../shared/catchAsync';
// import sendResponse from '../../../shared/sendResponse';
// import { TermsConditionService } from './termsConditions.service';

// const termsConditionsService = new TermsConditionService();

// const createOrUpdateTermsConditions = catchAsync(async (req, res, next) => {
//   const result = await termsConditionsService.createOrUpdateTermsConditions(
//     req.body
//   );
//   sendResponse(res, {
//     code: StatusCodes.OK,
//     message: 'TermsConditions updated successfully',
//     data: result,
//   });
// });

// const getTermsConditions = catchAsync(async (req, res, next) => {
//   const result = await termsConditionsService.getTermsConditions();
//   sendResponse(res, {
//     code: StatusCodes.OK,
//     message: 'TermsConditions fetched successfully',
//     data: result,
//   });
// });

// export const TermsConditionsController = {
//   createOrUpdateTermsConditions,
//   getTermsConditions,
// };

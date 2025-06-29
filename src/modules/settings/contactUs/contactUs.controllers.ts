// import { StatusCodes } from 'http-status-codes';

// import catchAsync from '../../../shared/catchAsync';
// import sendResponse from '../../../shared/sendResponse';
// import { ContactUsService } from './contactUs.service';

// const contractUsService = new ContactUsService();

// const createOrUpdateContactUs = catchAsync(async (req, res, next) => {
//   const result = await contractUsService.createOrUpdateContactUs(req.body);
//   sendResponse(res, {
//     code: StatusCodes.OK,
//     message: 'Contact us updated successfully',
//     data: result,
//   });
// });

// const getContactUs = catchAsync(async (req, res, next) => {
//   const result = await contractUsService.getContactUs();
//   sendResponse(res, {
//     code: StatusCodes.OK,
//     message: 'Contact us fetched successfully',
//     data: result,
//   });
// });

// export const ContactUsController = {
//   createOrUpdateContactUs,
//   getContactUs,
// };

import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../shared/catchAsync';
import { SettingsService } from './settings.service';
import sendResponse from '../../shared/sendResponse';
import { capitalizeFirstLetter } from '../../utils/capitalize';

const settingsService = new SettingsService();

const createOrUpdateSettings = catchAsync(async (req, res, next) => {
  const result = await settingsService.createOrUpdateSettings(
    req.query.type,
    req.body
  );

  sendResponse(res, {
    code: StatusCodes.OK,
    message: `${capitalizeFirstLetter(req.query.type?.toString())} updated successfully`,
    data: result,
  });
});

const getDetailsByType = catchAsync(async (req, res, next) => {
  const result = await settingsService.getDetailsByType(req.query.type);

  sendResponse(res, {
    code: StatusCodes.OK,
    message: `${capitalizeFirstLetter(req.query.type?.toString())} fetched successfully`,
    data: result,
  });
});

export const SettingsController = {
  createOrUpdateSettings,
  getDetailsByType,
};

//[🚧][🧑‍💻✅][🧪] // 🆗

import { StatusCodes } from 'http-status-codes';
import ApiError from '../../errors/ApiError';
import { GenericService } from '../Generic Service/generic.services';
import { settingsType } from './settings.constant';
import { ISettings } from './settings.interface';
import { Settings } from './settings.model';


const allowedTypes = [
  settingsType.aboutUs,
  settingsType.contactUs,
  settingsType.privacyPolicy,
  settingsType.termsAndConditions,
];


export class SettingsService extends GenericService<typeof Settings> {
  constructor() {
    super(Settings);
  }

  async createOrUpdateSettings(type: any, payload: any) {
    // List of allowed settings types

    // const allowedTypes = [
    //   settingsType.aboutUs,
    //   settingsType.contactUs,
    //   settingsType.privacyPolicy,
    //   settingsType.termsAndConditions,
    // ];

    if (!allowedTypes.includes(type)) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        `Unsupported settings type: ${type} ... Possible values are ${allowedTypes.join(', ')}`
      );
    }

    // Find existing setting by type
    const existingSetting = await Settings.findOne({ type });
    if (existingSetting) {
      // existingSetting.set(payload.details); // ISSUE : not working ..
      existingSetting.details = payload.details;
      return await existingSetting.save();
    } else {
      // Ensure payload contains the correct type
      payload.type = type;
      return await Settings.create(payload);
    }
  }

  async getDetailsByType(type: any) {

    if (!allowedTypes.includes(type)) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        `Unsupported settings type: ${type} ... Possible values are ${allowedTypes.join(', ')}`
      );
    }

    const setting = await Settings.find({ type }); // .sort({ createdAt: -1 })

    
    if (setting.length === 0) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        `Details not found for type: ${type}..`
      );
    }

    return setting;
  }
}

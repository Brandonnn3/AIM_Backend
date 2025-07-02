import { GenericService } from '../Generic Service/generic.services';
import { UserCompany } from '../userCompany/userCompany.model';
import { Company } from './company.model';
import { TUser } from '../user/user.interface';
import ApiError from '../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';

export class CompanyService extends GenericService<typeof Company> {
  constructor() {
    super(Company);
  }

  // This function creates the link between a user and a company.
  async joinCompany(user: TUser, companyId: string) {
    const existingLink = await UserCompany.findOne({ userId: user._id });
    if (existingLink) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'User is already associated with a company.'
      );
    }

    const userCompany = await UserCompany.create({
      userId: user._id,
      companyId: companyId,
      role: user.role,
    });

    if (!userCompany) {
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Failed to associate user with the company.'
      );
    }

    return userCompany;
  }

  // This is the primary function for the new manager onboarding.
  async setupCompanyProfile(companyProfileData: any, user: TUser) {
    // MODIFIED: This check is now at the very beginning.
    // 1. Check if the user is already linked to any company.
    const existingLink = await UserCompany.findOne({ userId: user._id });
    if (existingLink) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'This user account is already part of a company.');
    }

    // 2. Check if a company with this name already exists
    const existingCompany = await Company.findOne({
      name: { $regex: new RegExp(`^${companyProfileData.name}$`, 'i') },
    });

    if (existingCompany) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'A company with this name already exists.');
    }

    // 3. Create the new company with all the profile data
    const newCompany = await Company.create(companyProfileData);
    if (!newCompany) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to create the company.');
    }

    // 4. Link the user to the new company
    const userCompanyLink = await this.joinCompany(user, newCompany._id.toString());

    return { newCompany, userCompanyLink };
  }
}

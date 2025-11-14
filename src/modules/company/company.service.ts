import { GenericService } from '../Generic Service/generic.services';
import { UserCompany } from '../userCompany/userCompany.model';
import { Company } from './company.model';
import { TUser } from '../user/user.interface';
import ApiError from '../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import { ICompany } from './company.interface';
import { User } from '../user/user.model'; // Import the User model

export class CompanyService extends GenericService<typeof Company> {
  constructor() {
    super(Company);
  }

  async getCompanyByManagerId(userId: string): Promise<ICompany | null> {
    const userCompanyLink = await UserCompany.findOne({ userId: userId })
      .populate({
        path: 'companyId',
        model: 'Company' 
      });

    if (!userCompanyLink) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Manager is not associated with any company.');
    }
    return userCompanyLink.companyId as unknown as ICompany;
  }

  async updateCompanyById(companyId: string, payload: Partial<ICompany>, userId: string): Promise<ICompany | null> {
    const userCompanyLink = await UserCompany.findOne({ userId: userId });
    if (!userCompanyLink || userCompanyLink.companyId.toString() !== companyId) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'You do not have permission to edit this company.');
    }

    const updatedCompany = await this.updateById(companyId, payload as any);
    return updatedCompany; // <-- THIS WAS THE FIX (was 'updated.')
  }

  async joinCompany(user: TUser | any, companyId: string) { // Allow 'any' for JWT payload
    const userId = user._id || user.userId; // Get ID from Mongoose doc or JWT
    const existingLink = await UserCompany.findOne({ userId: userId });
    if (existingLink) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'User is already associated with a company.'
      );
    }

    const userCompany = await UserCompany.create({
      userId: userId,
      companyId: companyId,
      role: user.role,
    });

    if (!userCompany) {
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Failed to associate user with the company.'
      );
    }

    // --- START FIX: Immediately update the user's companyId field ---
    // This makes the User document the single source of truth.
    await User.findByIdAndUpdate(userId, { companyId: companyId });
    // --- END FIX ---

    return userCompany;
  }

  async setupCompanyProfile(companyProfileData: any, user: any) { // 'user' is the JWT payload, so use 'any'
    // --- START FIX: Check the User object using the correct ID from the JWT payload ---
    // The 'user' object here is the JWT payload, which has 'userId'.
    const fullUser = await User.findById(user.userId); // <-- THIS IS THE FIX
    if (!fullUser) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'User not found.');
    }

    if (fullUser.companyId) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'This user account is already part of a company.');
    }
    // --- END FIX ---

    const existingCompany = await Company.findOne({
      name: { $regex: new RegExp(`^${companyProfileData.name}$`, 'i') },
    });

    if (existingCompany) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'A company with this name already exists.');
    }

    const newCompany = await Company.create(companyProfileData);
    if (!newCompany) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to create the company.');
    }

    // Pass the full user document to joinCompany, as it's now available
    const userCompanyLink = await this.joinCompany(fullUser, newCompany._id.toString());

    return { newCompany, userCompanyLink };
  }
}
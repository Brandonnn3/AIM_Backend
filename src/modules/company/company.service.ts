import { GenericService } from '../Generic Service/generic.services';
import { UserCompany } from '../userCompany/userCompany.model';
import { Company } from './company.model';
import { TUser } from '../user/user.interface';
import ApiError from '../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import { ICompany } from './company.interface';

export class CompanyService extends GenericService<typeof Company> {
  constructor() {
    super(Company);
  }

  async getCompanyByManagerId(userId: string): Promise<ICompany | null> {
    // ✅ DEFINITIVE FIX: The .populate() now correctly fetches the full company document.
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
    return updatedCompany;
  }

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

  async setupCompanyProfile(companyProfileData: any, user: TUser) {
    const existingLink = await UserCompany.findOne({ userId: user._id });
    if (existingLink) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'This user account is already part of a company.');
    }

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

    const userCompanyLink = await this.joinCompany(user, newCompany._id.toString());

    return { newCompany, userCompanyLink };
  }
}

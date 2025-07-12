import { model, Schema } from 'mongoose';
import paginate from '../../common/plugins/paginate';
// FIX: Import the corrected interface names
import { IUserCompany, IUserCompanyModel } from './userCompany.interface';

// FIX: Use the corrected interface name
const userCompanySchema = new Schema<IUserCompany>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [false, 'User Id is required'],
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: [false, 'Company Id is required'],
    },
    role: {
      type: String,
      required: [false, 'Role is not required'],
    },
  },
  { timestamps: true }
);

userCompanySchema.index({ userId: 1, companyId: 1 });

userCompanySchema.plugin(paginate);

userCompanySchema.set('toJSON', {
  transform: function (doc: any, ret: any, options: any) {
    ret.id = ret._id; // Create a new 'id' field
    delete ret._id;   // Delete the original _id
    delete ret.__v;  // Delete the __v
    return ret;
  },
});

// FIX: Use the corrected interface names
export const UserCompany = model<IUserCompany, IUserCompanyModel>('UserCompany', userCompanySchema);
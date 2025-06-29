import { model, Schema } from 'mongoose';
import paginate from '../../common/plugins/paginate';
import { ICompany, ICompanyModel } from './userCompany.interface';

const userCompanySchema = new Schema<ICompany>(
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
    }
  },
  { timestamps: true }
);

// Indexes for performance
userCompanySchema.index({ userId: 1, companyId: 1 }); // , { unique: true }

userCompanySchema.plugin(paginate);

// Use transform to rename _id to _projectId
userCompanySchema.set('toJSON', {
  transform: function (doc, ret, options) {
    ret._userCompanyId = ret._id; // Rename _id to _projectId
    delete ret._id; // Remove the original _id field
    return ret;
  },
});

export const UserCompany = model<ICompany, ICompanyModel>('UserCompany', userCompanySchema);

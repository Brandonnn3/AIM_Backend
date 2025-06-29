import { model, Schema } from 'mongoose';
import paginate from '../../common/plugins/paginate';
import { ICompany, ICompanyModel } from './company.interface';

const companySchema = new Schema<ICompany>(
  {
    name: {
      type: String,
      required: [true, 'name is required'],
    },
  },
  { timestamps: true }
);

companySchema.plugin(paginate);

// Use transform to rename _id to _projectId
companySchema.set('toJSON', {
  transform: function (doc, ret, options) {
    ret._companyId = ret._id; // Rename _id to _projectId
    delete ret._id; // Remove the original _id field
    return ret;
  },
});

export const Company = model<ICompany, ICompanyModel>('Company', companySchema);

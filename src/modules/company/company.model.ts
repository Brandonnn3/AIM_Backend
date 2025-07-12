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
  transform: function (doc: any, ret: any, options: any) {
    ret.id = ret._id; // Create a new 'id' field
    delete ret._id;   // Delete the original _id
    delete ret.__v;  // Delete the __v
    return ret;
  },
});

export const Company = model<ICompany, ICompanyModel>('Company', companySchema);

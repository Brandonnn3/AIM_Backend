import { model, Schema } from 'mongoose';
import paginate from '../../common/plugins/paginate';
import { ICompany, ICompanyModel } from './company.interface';

const companySchema = new Schema<ICompany>(
  {
    name: {
      type: String,
      required: [true, 'name is required'],
    },
    // ✅ ADDED new fields for company details.
    address: { type: String },
    city: { type: String },
    state: { type: String },
    zipCode: { type: String },
    phoneNumber: { type: String },
    logo: { type: String },
  },
  { timestamps: true }
);

companySchema.plugin(paginate);

companySchema.set('toJSON', {
  transform: function (doc: any, ret: any, options: any) {
    ret.id = ret._id;
    delete ret._id;
   delete ret.__v;
    return ret;
  },
});

export const Company = model<ICompany, ICompanyModel>('Company', companySchema);

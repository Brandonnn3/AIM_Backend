import { model, Schema } from 'mongoose';
import paginate from '../../common/plugins/paginate';
import { IContract, IContractModel } from './contract.interface';
import { CreatorRole } from './contract.constant';

const contractSchema = new Schema<IContract>(
  {
    attachments: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Attachment',
        required: [true, 'Attachments is required'],
      },
    ],

    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: [false, 'Project Id is required'],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [false, 'User Id is required'],
    },
    creatorRole: {
      enum: [CreatorRole.projectManager, CreatorRole.projectSupervisor],
      type: String,
      required: [
        true,
        'Creator Role is required. It can be projectManager / projectSupervisor',
      ],
    },
  },
  { timestamps: true }
);

contractSchema.plugin(paginate);

// Use transform to rename _id to _projectId
contractSchema.set('toJSON', {
  transform: function (doc: any, ret: any, options: any) {
    ret.id = ret._id; // Create a new 'id' field
    delete ret._id;   // Delete the original _id
    delete ret.__v;  // Delete the __v
    return ret;
  },
});

export const Contract = model<IContract, IContractModel>(
  'Contract',
  contractSchema
);

import { model, Schema } from 'mongoose';
import paginate from '../../common/plugins/paginate';
import { IProject, IProjectModel } from './project.interface';
import { Status } from './project.constant';

const projectSchema = new Schema<IProject>(
  {
    projectName: {
      type: String,
      required: [true, 'Project name is required'],
    },
    projectLogo: {
      type: String,
      required: [false, 'Project logo is required'],
    },
    // IDEA : project Manager er id o ki ekhane rakhte hobe kina..
    projectSuperVisorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [false, 'ProjectSuperVisorId is not required'],
    },

    projectManagerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Project Manager Id is required'],
    },

    // address: {
    streetAddress: {
      type: String,
      required: [false, 'Street Address is required'],
    },
    city: {
      type: String,
      required: [false, 'City is required'],
    },
    zipCode: {
      type: String,
      required: [false, 'Address is required'],
    },
    country: {
      type: String,
      required: [false, 'Address is required'],
    },
    // },
    // deadline: {
    startDate: {
      type: Date,
      required: [false, 'Start Date is required'],
    },
    endDate: {
      type: Date,
      required: [false, 'End Date is required'],
    },
    // },

    attachments: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Attachment',
        required: [false, 'Attachments is required'],
      },
    ],
    projectStatus: {
      type: String,
      enum: [Status.completed, Status.open],
      required: [
        false,
        'Project Status is required. It can be completed / open',
      ],
      // default : Status.open
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

projectSchema.plugin(paginate);

projectSchema.pre('save', function (next) {
  next();
});

// Use transform to rename _id to _projectId
projectSchema.set('toJSON', {
  transform: function (doc, ret, options) {
    ret._projectId = ret._id; // Rename _id to _projectId
    delete ret._id; // Remove the original _id field
    return ret;
  },
});

export const Project = model<IProject, IProjectModel>('Project', projectSchema);

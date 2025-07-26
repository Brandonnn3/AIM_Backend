import { model, Schema, Document } from 'mongoose';
import paginate from '../../common/plugins/paginate';
import { IProject, IProjectModel } from './project.interface';
import { Status } from './project.constant';

const projectSchema = new Schema<IProject>(
  {
    pid: {
      type: String,
      unique: true,
      index: true,
    },
    projectName: {
      type: String,
      required: [true, 'Project name is required'],
    },
    projectLogo: {
      type: String,
      required: [false, 'Project logo is required'],
    },
    // ✨ FIX: Changed from a single ID to an array of IDs
    projectSuperVisorIds: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      required: [false, 'ProjectSuperVisorIds are not required'],
    },
    projectManagerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Project Manager Id is required'],
    },
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
    startDate: {
      type: Date,
      required: [false, 'Start Date is required'],
    },
    endDate: {
      type: Date,
      required: [false, 'End Date is required'],
    },
    attachments: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Attachment',
        required: [false, 'Attachments is required'],
      },
    ],
    projectStatus: {
      type: String,
      enum: Object.values(Status),
      default: Status.planning,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

projectSchema.plugin(paginate);

projectSchema.pre<IProject>('save', async function (next) {
  if (this.isNew) {
    const ProjectModel = this.constructor as IProjectModel;
    const lastProject = await ProjectModel.findOne().sort({ createdAt: -1 });
    if (lastProject && lastProject.pid) {
      const lastId = parseInt(lastProject.pid.split('-')[1]);
      this.pid = 'PID-' + (lastId + 1).toString().padStart(3, '0');
    } else {
      this.pid = 'PID-001';
    }
  }
  next();
});

projectSchema.set('toJSON', {
  transform: function (doc: any, ret: any, options: any) {
    ret.id = ret._id; // Create a new 'id' field
    delete ret._id;   // Delete the original _id
    delete ret.__v;  // Delete the __v
    return ret;
  },
});

export const Project = model<IProject, IProjectModel>('Project', projectSchema);

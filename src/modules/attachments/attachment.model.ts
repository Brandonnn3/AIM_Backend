import { model, Schema, Document } from 'mongoose'; // Corrected import
import paginate from '../../common/plugins/paginate';
import { IAttachment, IAttachmentModel } from './attachment.interface';
import {
  AttachedToType,
  AttachmentType,
  UploaderRole,
} from './attachment.constant';

const attachmentSchema = new Schema<IAttachment>(
  {
    attachment: {
      type: String,
      required: [true, 'attachment is required'],
    },
    attachmentType: {
      type: String,
      enum: [AttachmentType.document, AttachmentType.image],
      required: [true, 'Attached Type is required. It can be pdf / image'],
    },
    attachedToId: {
      type: String,
      required: [false, 'AttachedToId is required.'],
    },
    attachedToType: {
      enum: [
        AttachedToType.note,
        AttachedToType.task,
        AttachedToType.project,
        AttachedToType.contract,
      ],
      type: String,
      required: [false, 'AttachedToType is required. It can be note / task'],
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: [false, 'Project Id is required'],
    },
    uploadedByUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [false, 'User Id is required'],
    },
    uploaderRole: {
      type: String,
      enum: [UploaderRole.projectManager, UploaderRole.projectSupervisor, UploaderRole.admin], // Added admin
      required: true,
    },
    reactions: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: false },
      },
    ],
  },
  { timestamps: true }
);

attachmentSchema.plugin(paginate);

// FIX: Add types to the transform function parameters
attachmentSchema.set('toJSON', {
  transform: function (doc: any, ret: any, options: any) {
    ret.id = ret._id; // Create a new 'id' field
    delete ret._id;   // Delete the original _id
    delete ret.__v;  // Delete the __v
    return ret;
  },
});

export const Attachment = model<IAttachment, IAttachmentModel>(
  'Attachment',
  attachmentSchema
);
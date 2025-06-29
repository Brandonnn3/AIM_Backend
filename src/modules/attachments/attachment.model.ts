import { model, Schema } from 'mongoose';
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
      enum: [UploaderRole.projectManager, UploaderRole.projectSupervisor],
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

// Use transform to rename _id to _projectId
attachmentSchema.set('toJSON', {
  transform: function (doc, ret, options) {
    ret._attachmentId = ret._id; // Rename _id to _projectId
    delete ret._id; // Remove the original _id field
    return ret;
  },
});

export const Attachment = model<IAttachment, IAttachmentModel>(
  'Attachment',
  attachmentSchema
);

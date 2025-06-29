import { model, Schema } from 'mongoose';
import { INotification, INotificationModal } from './notification.interface';
import paginate from '../../common/plugins/paginate';
import { Roles } from '../../middlewares/roles';

const notificationModel = new Schema<INotification>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
    },

    receiverId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [false, 'User is required'],
    },
    role: {
      type: String,
      enum: Roles,
      required: true,
    },

    linkId: {
      type: String,
    },
    notificationFor: {
      type: String,
      enum: ['project', 'task', 'note', 'attachment'],
      required: [true, 'Notification for is required'],
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: [false, 'Project is required'],
    },
    extraInformation: {
      type: String,
      required: [false, 'Extra information is not required'],
    },
    viewStatus: { type: Boolean, default: false },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

notificationModel.plugin(paginate);

export const Notification = model<INotification, INotificationModal>(
  'Notification',
  notificationModel
);

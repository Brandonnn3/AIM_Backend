import { model, Schema } from 'mongoose';
import paginate from '../../common/plugins/paginate';
import { INote, INoteModel } from './note.interface';
import { noteStatus } from './note.constant';

const noteSchema = new Schema<INote>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
    },
    description : {
      type: String,
      required: [true, 'Description is required']
    },
    attachments: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Attachment',
        required: [true, 'Attachments is required'],
      }
    ],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [false, 'User is required'],
    },
    
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: [false, 'DailyLog is required'],
    },
    
    isAccepted : {
      type: String,
      enum: [noteStatus.accepted ,noteStatus.pending, noteStatus.denied],  
      required: [false, 'Status is required. It can be accepted / pending / denied'],
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

noteSchema.plugin(paginate);

noteSchema.set('toJSON', {
  transform: function (doc, ret, options) {
    ret._noteId = ret._id;  // Rename _id to _projectId
    delete ret._id;  // Remove the original _id field
    return ret;
  }
});

export const Note = model<INote, INoteModel>(
  'Note',
  noteSchema
);

import { model, Schema, Document, Model, Types } from 'mongoose';
import paginate from '../../common/plugins/paginate';
import { noteStatus } from './note.constant';
import { PaginateOptions, PaginateResult } from '../../types/paginate';

// FIX: Define the correct interfaces directly in this file
export interface INote extends Document {
  title: string;
  description: string;
  attachments: Types.ObjectId[];
  createdBy: Types.ObjectId;
  projectId: Types.ObjectId;
  isAccepted: string;
  isDeleted?: boolean;
}

export interface INoteModel extends Model<INote> {
  paginate(
    query: Record<string, any>,
    options: PaginateOptions
  ): Promise<PaginateResult<INote>>;
}
// End of new interfaces

const noteSchema = new Schema<INote>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
    },
    attachments: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Attachment',
        required: false, // Changed to false as notes can be created without attachments
      },
    ],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [false, 'User is required'],
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: [false, 'Project ID is required'],
    },
    isAccepted: {
      type: String,
      enum: [noteStatus.accepted, noteStatus.pending, noteStatus.denied],
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
  transform: function (doc: any, ret: any, options: any) {
    ret.id = ret._id; // Create a new 'id' field
    delete ret._id;   // Delete the original _id
    delete ret.__v;  // Delete the __v
    return ret;
  },
});

export const Note = model<INote, INoteModel>('Note', noteSchema);
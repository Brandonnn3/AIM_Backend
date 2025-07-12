import { model, Schema } from 'mongoose';
import paginate from '../../common/plugins/paginate';
import { ITask, ITaskModel } from './task.interface';
import { TaskStatus } from './task.constant';

const taskSchema = new Schema<ITask>(
  {
    task_status: {
      type: String,
      enum: [TaskStatus.complete, TaskStatus.denied, TaskStatus.open], // only open or complete hoite pare 
      required: [true, 'Task status is required'],
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [false, 'User is required'],
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: [false, 'Project is required'],
    },
    dueDate: {
      type: Date,
    },
    title : {
      type: String,
      required: [false, 'Description is required'],
    },
    description : {
      type: String,
      required: [true, 'Description is required'],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [false, 'User is required'],
    },
    attachments: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Attachment',
        required: [true, 'Attachments is required'],
      }
    ],
    isDeleted: {
      type: Boolean,
      default: false,
    },
    //viewStatus: { type: Boolean, default: false },
  },
  { timestamps: true }
);

taskSchema.plugin(paginate);

// taskSchema.pre('save', function(next) {
//   // Rename _id to _projectId
//   this._taskId = this._id;
//   this._id = undefined;  // Remove the default _id field
//   next();
// });


// Use transform to rename _id to _projectId
taskSchema.set('toJSON', {
  transform: function (doc: any, ret: any, options: any) {
    ret.id = ret._id; // Create a new 'id' field
    delete ret._id;   // Delete the original _id
    delete ret.__v;  // Delete the __v
    return ret;
  }
});


export const Task = model<ITask, ITaskModel>(
  'Task',
  taskSchema
);

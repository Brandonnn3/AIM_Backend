import { Model, Types } from 'mongoose';
import { PaginateOptions, PaginateResult } from '../../types/paginate';
import {
  AttachmentType,
  AttachedToType,
  UploaderRole,
} from './attachment.constant';

// FIX  // TODO : joto jaygay role ase .. role gula check dite hobe ..
export interface IAttachment {
  _id?: Types.ObjectId;
  attachment: string;
  attachmentType: AttachmentType.image | AttachmentType.document;
  attachedToId: string;
  attachedToType:
    | AttachedToType.note
    | AttachedToType.task
    | AttachedToType.contract; // INFO :  contract pore add kora hoise ..
  projectId: Types.ObjectId | string;
  uploadedByUserId?: Types.ObjectId | string;
  uploaderRole: UploaderRole.projectManager | UploaderRole.projectSupervisor;
  viewStatus?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  reactions?: [
    {
      userId: Types.ObjectId | string;
      // reactionType: string; // we can add more reaction type here ...
    }
  ];
}

export interface IAttachmentModel extends Model<IAttachment> {
  paginate: (
    query: Record<string, any>,
    options: PaginateOptions
  ) => Promise<PaginateResult<IAttachment>>;
}

import { GenericService } from '../Generic Service/generic.services';
import { Task } from './task.model';

export class TaskService extends GenericService<typeof Task> {
  constructor() {
    super(Task);
  }

  async getById(id: string) {
    const object = await this.model
      .findById(id)
      .select('-__v')
      .populate({
        path: 'attachments',
        select:
          '-uploadedByUserId -updatedAt  -uploaderRole -reactions -__v -attachedToId -attachedToType -_attachmentId',
        // populate: [
        //   {
        //     path: 'projectId',
        //     select: 'projectName',
        //   },
        // ],
      })
      .populate({
        path: 'assignedTo',
        select:
          ' -__v -email -profileImage -fcmToken -role -isEmailVerified -isDeleted -isResetPassword -failedLoginAttempts -createdAt -updatedAt',
        // populate: [
        //   {
        //     path: 'projectId',
        //     select: 'projectName',
        //   },
        // ],
      });

    // TODO : aro fine tune korte hobe query optimize korte hobe ..
    // FIXME : : must ..
    if (!object) {
      // throw new ApiError(StatusCodes.BAD_REQUEST, 'No file uploaded');
      return null;
    }
    return object;
  }
}

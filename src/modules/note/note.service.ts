import mongoose, { Mongoose } from 'mongoose';
import { GenericService } from '../Generic Service/generic.services';
import { Note } from './note.model';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../errors/ApiError';
import { Attachment } from '../attachments/attachment.model';

export class NoteService extends GenericService<typeof Note> {
  constructor() {
    super(Note);
  }

  async getById(id: string) {
    const object = await this.model
      .findById(id)
      .select('-__v')
      .populate({
        path: 'attachments',
        select:
          '-uploadedByUserId -updatedAt  -uploaderRole -reactions -__v -attachedToId -attachedToType -_attachmentId',
      })
      .populate({
        path: 'projectId',
        select: 'projectName country zipCode city streetAddress',
      })
      .populate({
        path: 'createdBy',
        select:
          '-address -fname -lname -email -profileImage -isEmailVerified -isDeleted -isResetPassword -failedLoginAttempts -createdAt -updatedAt -__v',
      });

    if (!object) {
      return null;
    }
    return object;
  }

  async getAllByDateAndProjectId(projectId: string, date: string) {
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Invalid projectId');
    }

    const parsedDate = new Date(date);

    if (isNaN(parsedDate.getTime())) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Invalid date format');
    }

    const startOfDay = new Date(parsedDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(parsedDate.setHours(23, 59, 59, 999));

    const notesWithAttachmentCounts = await Note.aggregate([
      {
        $match: {
          projectId: new mongoose.Types.ObjectId(projectId),
          createdAt: { $gte: startOfDay, $lte: endOfDay },
        },
      },
      {
        $lookup: {
          from: 'attachments',
          localField: 'attachments',
          foreignField: '_id',
          as: 'attachmentDetails',
        },
      },
      {
        $addFields: {
          imageCount: {
            $size: {
              $filter: {
                input: '$attachmentDetails',
                as: 'att',
                cond: { $eq: ['$$att.attachmentType', 'image'] },
              },
            },
          },
          documentCount: {
            $size: {
              $filter: {
                input: '$attachmentDetails',
                as: 'att',
                cond: { $eq: ['$$att.attachmentType', 'document'] },
              },
            },
          },
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          description: 1,
          isAccepted: 1,
          createdAt: 1,
          imageCount: 1,
          documentCount: 1,
        },
      },
    ]);

    const totalNoteCount = await Note.countDocuments({
      projectId: projectId,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    const totalImageCount = await Attachment.countDocuments({
      attachedToType: 'note',
      projectId: projectId,
      attachmentType: 'image',
      uploaderRole: 'projectSupervisor',
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    const totalDocumentCount = await Attachment.countDocuments({
      attachedToType: 'note',
      projectId: projectId,
      attachmentType: 'document',
      uploaderRole: 'projectSupervisor',
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    return {
      notes: notesWithAttachmentCounts,
      totalNoteCount,
      imageCount: totalImageCount,
      documentCount: totalDocumentCount,
    };
  }

  async getPreviewByDateAndProjectId(projectId: string, date: string) {
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Invalid projectId');
    }

    const parsedDate = new Date(date);

    if (isNaN(parsedDate.getTime())) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Invalid date format');
    }

    const startOfDay = new Date(parsedDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(parsedDate.setHours(23, 59, 59, 999));

    const result = await Note.find({
      projectId: projectId,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    })
      .select('-__v')
      .populate({
        path: 'attachments',
        select:
          '-uploadedByUserId -updatedAt -projectId -uploaderRole -reactions -__v -attachedToId -attachedToType -_attachmentId',
      })
      .exec();

    return {
      notes: result,
    };
  }

  async getAllimagesOrDocumentOFnoteOrTaskByDateAndProjectId(
    projectId: string,
    date: string,
    noteOrTaskOrProject: string,
    imageOrDocument: string,
    uploaderRole: string
  ) {
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Invalid projectId');
    }

    const parsedDate = new Date(date);

    if (isNaN(parsedDate.getTime())) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Invalid date format');
    }

    const startOfDay = new Date(parsedDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(parsedDate.setHours(23, 59, 59, 999));

    const attachments = await Attachment.find({
      attachedToType: noteOrTaskOrProject,
      projectId: projectId,
      attachmentType: imageOrDocument,
      uploaderRole: uploaderRole,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    })
      .select(
        '-projectId -updatedAt -__v -attachedToId -note -_attachmentId -attachmentType'
      )
      .exec();

    const totalImageCount = await Attachment.countDocuments({
      attachedToType: noteOrTaskOrProject,
      projectId: projectId,
      attachmentType: 'image',
      uploaderRole: uploaderRole,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    const totalDocumentCount = await Attachment.countDocuments({
      attachedToType: noteOrTaskOrProject,
      projectId: projectId,
      attachmentType: 'document',
      uploaderRole: uploaderRole,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    const totalNoteCount = await Note.countDocuments({
      projectId: projectId,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    // FIX: Explicitly type the date parameter to avoid implicit 'any' error.
    const formatDate = (date: string | Date | undefined): string => {
      if (!date) return '';
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      };
      return new Date(date).toLocaleDateString('en-US', options);
    };

    const groupedByDate = attachments.reduce((acc: any, attachment) => {
      const dateKey = formatDate(attachment.createdAt);
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(attachment);
      return acc;
    }, {});

    const result = Object.keys(groupedByDate).map(date => ({
      date: date,
      attachments: groupedByDate[date],
      totalNoteCount,
      totalImageCount,
      totalDocumentCount,
    }));

    return result;
  }
}

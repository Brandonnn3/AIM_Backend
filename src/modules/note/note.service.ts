import mongoose, { Mongoose, Types } from 'mongoose';
import { GenericService } from '../Generic Service/generic.services';
import { Note } from './note.model';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../errors/ApiError';
import { Attachment } from '../attachments/attachment.model';
import { AttachmentService } from '../attachments/attachment.service';

const attachmentService = new AttachmentService();

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

    const startOfDay = new Date(new Date(parsedDate).setHours(0, 0, 0, 0));
    const endOfDay = new Date(new Date(parsedDate).setHours(23, 59, 59, 999));

    // The aggregation pipeline should be supported by DocumentDB 3.6,
    // as it uses a basic $lookup. The error likely comes from other files.
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
              $filter: { input: '$attachmentDetails', as: 'att', cond: { $eq: ['$$att.attachmentType', 'image'] } },
            },
          },
          documentCount: {
            $size: {
              $filter: { input: '$attachmentDetails', as: 'att', cond: { $eq: ['$$att.attachmentType', 'document'] } },
            },
          },
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $project: {
          _id: 1, title: 1, description: 1, isAccepted: 1, createdAt: 1, imageCount: 1, documentCount: 1,
        },
      },
    ]);

    let totalImageCount = 0;
    let totalDocumentCount = 0;
    // --- FIX: Explicitly type the 'note' parameter to resolve TS7006 ---
    notesWithAttachmentCounts.forEach((note: any) => {
        totalImageCount += note.imageCount;
        totalDocumentCount += note.documentCount;
    });

    return {
      notes: notesWithAttachmentCounts,
      totalNoteCount: notesWithAttachmentCounts.length,
      imageCount: totalImageCount,
      documentCount: totalDocumentCount,
    };
  }

  async deleteNoteAndAttachments(noteId: string) {
    const note = await Note.findById(noteId).populate('attachments');
    if (!note) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Note not found');
    }

    if (note.attachments && note.attachments.length > 0) {
      for (const attachment of note.attachments as any[]) {
        await attachmentService.deleteAttachment(attachment.attachment);
        await attachmentService.deleteById(attachment._id.toString());
      }
    }

    await this.deleteById(noteId);
    return { success: true, message: 'Note and attachments deleted.' };
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

    const query: any = {
      projectId: new mongoose.Types.ObjectId(projectId),
    };

    if (imageOrDocument) {
      query.attachmentType = imageOrDocument;
    }
    if (noteOrTaskOrProject) {
      query.attachedToType = noteOrTaskOrProject;
    }
    if (uploaderRole) {
      query.uploaderRole = uploaderRole;
    }

    if (date) {
        const parsedDate = new Date(`${date}T00:00:00.000Z`);

        if (!isNaN(parsedDate.getTime())) {
            const startOfDay = new Date(parsedDate);
            startOfDay.setUTCHours(0, 0, 0, 0);

            const endOfDay = new Date(parsedDate);
            endOfDay.setUTCHours(23, 59, 59, 999);

            query.createdAt = { $gte: startOfDay, $lte: endOfDay };
        }
    }

    console.log('Executing final attachment query:', JSON.stringify(query, null, 2));

    const attachments = await Attachment.find(query)
      .select(
        '-projectId -updatedAt -__v -attachedToId -note -_attachmentId -attachmentType'
      )
      .sort({ createdAt: -1 })
      .exec();
    
    const formatDate = (date: any) => {
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
    }));

    return result;
  }

  async findProjectsNearingDeadline() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(today.getDate() + 7);
    sevenDaysFromNow.setHours(23, 59, 59, 999);

    const projects = await this.model.find({
      isDeleted: false,
      endDate: {
        $gte: today,
        $lte: sevenDaysFromNow,
      },
    }).select('projectName endDate projectManagerId');

    return projects;
  }
}

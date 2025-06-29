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
        select: 'projectName country zipCode city streetAddress', // Adjust the fields you want to select from projectId model
      })
      .populate({
        path: 'createdBy',
        select:
          '-address -fname -lname -email -profileImage -isEmailVerified -isDeleted -isResetPassword -failedLoginAttempts -createdAt -updatedAt -__v', // Exclude unwanted fields from Location model
      });

    // TODO : need more query optimization ..

    if (!object) {
      // throw new ApiError(StatusCodes.BAD_REQUEST, 'No file uploaded');
      return null;
    }
    return object;
  }

  async getAllByDateAndProjectId(projectId: string, date: string) {
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Invalid projectId');
    }
    // const parsedDate = new Date(date);
    // if (isNaN(parsedDate.getTime())) {

    //     throw new ApiError(StatusCodes.NOT_FOUND, 'Invalid date format');
    // }

    // const result =  await Note.find({ projectId : projectId
    //    , createdAt: { $gte: date }
    // });

    // Parse the date string (e.g., '2025-03-03')
    const parsedDate = new Date(date);

    // Check if parsed date is valid
    if (isNaN(parsedDate.getTime())) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Invalid date format');
    }

    // Set start of the day (00:00:00.000)
    const startOfDay = new Date(parsedDate.setHours(0, 0, 0, 0));

    // Set end of the day (23:59:59.999)
    const endOfDay = new Date(parsedDate.setHours(23, 59, 59, 999));

    //🟢 Query Notes with exact date match for the given projectId and date range
    // const result = await Note.find({
    //   projectId: projectId,
    //   createdAt: { $gte: startOfDay, $lte: endOfDay },
    // }).exec();

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
          createdAt: -1, // Sort by createdAt in descending order (recent first)
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

    // Global count of images and documents
    // const totalCounts = await Note.aggregate([
    //   {
    //     $match: {
    //       projectId: new mongoose.Types.ObjectId(projectId),
    //       createdAt: { $gte: startOfDay, $lte: endOfDay },
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "attachments",
    //       localField: "attachments",
    //       foreignField: "_id",
    //       as: "attachmentDetails",
    //     },
    //   },
    //   {
    //     $unwind: "$attachmentDetails",
    //   },
    //   {
    //     $group: {
    //       _id: null,
    //       totalImages: {
    //         $sum: { $cond: [{ $eq: ["$attachmentDetails.attachmentType", "image"] }, 1, 0] },
    //       },
    //       totalDocuments: {
    //         $sum: { $cond: [{ $eq: ["$attachmentDetails.attachmentType", "document"] }, 1, 0] },
    //       },
    //     },
    //   },
    // ]);

    const totalNoteCount = await Note.countDocuments({
      projectId: projectId,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    // Get the total image count of attachments
    const totalImageCount = await Attachment.countDocuments({
      attachedToType: 'note',
      projectId: projectId,
      attachmentType: 'image',
      uploaderRole: 'projectSupervisor',
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    //  // Get the total document count of attachments
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
      imageCount: totalImageCount, // totalCounts.length ? totalCounts[0].totalImages : 0,
      documentCount: totalDocumentCount, // totalCounts.length ? totalCounts[0].totalDocuments : 0
    };
  }

  async getPreviewByDateAndProjectId(projectId: string, date: string) {
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Invalid projectId');
    }
    // const parsedDate = new Date(date);
    // if (isNaN(parsedDate.getTime())) {

    //     throw new ApiError(StatusCodes.NOT_FOUND, 'Invalid date format');
    // }

    // const result =  await Note.find({ projectId : projectId
    //    , createdAt: { $gte: date }
    // });

    // Parse the date string (e.g., '2025-03-03')
    const parsedDate = new Date(date);

    // Check if parsed date is valid
    if (isNaN(parsedDate.getTime())) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Invalid date format');
    }

    // Set start of the day (00:00:00.000)
    const startOfDay = new Date(parsedDate.setHours(0, 0, 0, 0));

    // Set end of the day (23:59:59.999)
    const endOfDay = new Date(parsedDate.setHours(23, 59, 59, 999));

    //🟢 Query Notes with exact date match for the given projectId and date range
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

    // const notesWithAttachmentCounts = await Note.aggregate([
    //   {
    //     $match: {
    //       projectId: new mongoose.Types.ObjectId(projectId),
    //       createdAt: { $gte: startOfDay, $lte: endOfDay },
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "attachments",
    //       localField: "attachments",
    //       foreignField: "_id",
    //       as: "attachmentDetails",
    //     },
    //   },
    //   {
    //     $addFields: {
    //       imageCount: {
    //         $size: {
    //           $filter: {
    //             input: "$attachmentDetails",
    //             as: "att",
    //             cond: { $eq: ["$$att.attachmentType", "image"] },
    //           },
    //         },
    //       },
    //       documentCount: {
    //         $size: {
    //           $filter: {
    //             input: "$attachmentDetails",
    //             as: "att",
    //             cond: { $eq: ["$$att.attachmentType", "document"] },
    //           },
    //         },
    //       },
    //     },
    //   },
    //   {
    //     $project: {
    //       _id: 1,
    //       title: 1,
    //       description: 1,
    //       isAccepted: 1,
    //       createdAt: 1,
    //       imageCount: 1,
    //       documentCount: 1,
    //     },
    //   },
    // ]);

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

    // Parse the date string (e.g., '2025-03-03')
    const parsedDate = new Date(date);

    if (isNaN(parsedDate.getTime())) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Invalid date format');
    }

    const startOfDay = new Date(parsedDate.setHours(0, 0, 0, 0));

    const endOfDay = new Date(parsedDate.setHours(23, 59, 59, 999));

    //🟢 Query Notes with exact date match for the given projectId and date range
    const attachments = await Attachment.find({
      attachedToType: noteOrTaskOrProject, // 'note'
      projectId: projectId,
      attachmentType: imageOrDocument, // 'image'
      uploaderRole: uploaderRole,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    })
      .select(
        '-projectId -updatedAt -__v -attachedToId -note -_attachmentId -attachmentType'
      )
      .exec();

    // Get the total image count of attachments
    const totalImageCount = await Attachment.countDocuments({
      attachedToType: noteOrTaskOrProject,
      projectId: projectId,
      attachmentType: 'image',
      uploaderRole: uploaderRole,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    // Get the total document count of attachments
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

    //////////////////////////////////////////////////////////////////////////////////////////

    // Helper function to extract the date portion (YYYY-MM-DD)

    //  const extractDate = (date) => {
    //   return new Date(date).toISOString().split('T')[0]; // Extract YYYY-MM-DD
    // };

    // Helper function to format date as "Sunday, February 23, 2025"
    const formatDate = date => {
      const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      };
      return new Date(date).toLocaleDateString('en-US', options);
    };

    // Group attachments by date
    const groupedByDate = attachments.reduce((acc: any, attachment) => {
      //const dateKey = extractDate(attachment.createdAt); // Extract YYYY-MM-DD
      const dateKey = formatDate(attachment.createdAt);
      if (!acc[dateKey]) {
        acc[dateKey] = []; // Initialize array for the date
      }
      acc[dateKey].push(attachment); // Add the attachment to the corresponding date
      return acc;
    }, {});

    // console.log('Grouped by Date:', groupedByDate);

    // Transform into the desired output format
    const result = Object.keys(groupedByDate).map(date => ({
      date: date,
      attachments: groupedByDate[date],
      totalNoteCount,
      totalImageCount,
      totalDocumentCount,
    }));

    //////////////////////////////////////////////////////////////////////////////////////////

    return result;
  }
}

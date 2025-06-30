import express from 'express';
import auth from '../../middlewares/auth';
import { NoteController } from './note.controller';
import { AttachmentController } from '../attachments/attachment.controller';
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const router = express.Router();

//info : pagination route must be before the route with params
router
  .route('/paginate')
  .get(auth('common'), NoteController.getAllNoteWithPagination);

//////////////////////////////////////////////////////
//[🚧][🧑‍💻✅][🧪🆗] // query :: projectId  date
router
  .route('/getAllByDateAndProjectId/')
  .get(auth('common'), NoteController.getAllByDateAndProjectId);

router
  .route('/getPreviewByDateAndProjectId/')
  .get(auth('common'), NoteController.getPreviewByDateAndProjectId);

//[🚧][🧑‍💻✅][🧪🆗] // query :: projectId, date, noteOrTaskOrProject, imageOrDocument
router
  .route('/getAllImagesOfAllNotesOfADateAndProjectId/')
  .get(
    auth('common'),
    NoteController.getAllimagesOrDocumentOFnoteOrTaskOrProjectByDateAndProjectId
  );

//////////////////////////////////////////////////////

//[🚧][🧑‍💻✅][🧪🆗]
router.route('/:noteId').get(auth('common'), NoteController.getANote);

//[🚧][🧑‍�✅][🧪🆗]
router
  .route('/changeStatus/:noteId')
  .get(auth('projectManager'), NoteController.changeStatusOfANote);

//===============================================================[🚧][🧑‍💻✅][🧪🆗V2]
router
  .route('/changeStatusOfANote/:noteId')
  .get(auth('projectManager'), NoteController.changeStatusOfANoteWithDeny);

router.route('/update/:noteId').put(
  auth('projectManager'),
  // validateRequest(UserValidation.createUserValidationSchema),
  NoteController.updateById
);

router.route('/').get(auth('common'), NoteController.getAllNote);

//[🚧][🧑‍💻✅][🧪🆗] //
router.route('/create').post(
  [
    upload.fields([
      { name: 'attachments', maxCount: 15 }, // Allow up to 5 cover photos
    ]),
  ],
  // MODIFIED: Added 'projectManager' to the list of allowed roles.
  auth('projectSupervisor', 'projectManager'),
  NoteController.createNote
);

// INFO : Create Attachment
router.route('/uploadImagesOrDocuments').post(
  [
    upload.fields([
      { name: 'attachments', maxCount: 15 }, // Allow up to 5 cover photos
    ]),
  ],
  auth('common'),
  AttachmentController.createAttachment
);

// eta front-end e integrate kora lagbe
router
  .route('/delete/:noteId')
  .delete(auth('common'), NoteController.deleteById);

export const NoteRoutes = router;
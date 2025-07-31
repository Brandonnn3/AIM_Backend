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
  .get(auth('projectManager', 'projectSupervisor'), NoteController.getAllNoteWithPagination);

//////////////////////////////////////////////////////
//[🚧][🧑‍💻✅][🧪🆗] // query :: projectId  date
router
  .route('/getAllByDateAndProjectId/')
  .get(auth('projectManager', 'projectSupervisor'), NoteController.getAllByDateAndProjectId);

router
  .route('/getPreviewByDateAndProjectId/')
  .get(auth('projectManager', 'projectSupervisor'), NoteController.getPreviewByDateAndProjectId);

//////////////////////////////////////////////////////

//[🚧][🧑‍💻✅][🧪🆗]
router.route('/:noteId').get(auth('projectManager', 'projectSupervisor'), NoteController.getANote);

//[🚧][🧑‍�✅][🧪🆗]
router
  .route('/changeStatus/:noteId')
  .get(auth('projectManager'), NoteController.changeStatusOfANote);

//===============================================================[🚧][🧑‍💻✅][🧪🆗V2]
router
  .route('/changeStatusOfANote/:noteId')
  .get(auth('projectManager'), NoteController.changeStatusOfANoteWithDeny);

router.route('/update/:noteId').put(
  auth('projectManager', 'projectSupervisor'), // Allow both to update
  NoteController.updateById
);

router.route('/').get(auth('projectManager', 'projectSupervisor'), NoteController.getAllNote);

//[🚧][🧑‍💻✅][🧪🆗] // 
router.route('/create').post(
  [
    upload.fields([
      { name: 'attachments', maxCount: 15 },
    ]),
  ],
  auth('projectSupervisor', 'projectManager'),
  NoteController.createNote
);

// INFO : Create Attachment
router.route('/uploadImagesOrDocuments').post(
  [
    upload.fields([
      { name: 'attachments', maxCount: 15 },
    ]),
  ],
  auth('projectManager', 'projectSupervisor'),
  AttachmentController.createAttachment
);

// eta front-end e integrate kora lagbe
router
  .route('/delete/:noteId')
  .delete(auth('projectManager', 'projectSupervisor'), NoteController.deleteById);

export const NoteRoutes = router;

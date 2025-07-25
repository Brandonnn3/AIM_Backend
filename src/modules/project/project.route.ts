import express from 'express';
import auth from '../../middlewares/auth';
import { ProjectController } from './project.controller';
import { NoteController } from '../note/note.controller';

const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const router = express.Router();

// GET ALL PROJECTS FOR THE LOGGED-IN MANAGER
router
  .route('/manager/all')
  .get(auth('projectManager'), ProjectController.getAllProjectsByManager);

// GET ALL PROJECTS WITH PAGINATION (FOR ADMINS/OTHER ROLES)
router
  .route('/paginate')
  .get(auth('projectManager'), ProjectController.getAllProjectWithPagination);

// GET ALL IMAGES FOR A PROJECT
router
  .route('/getAllImagesOfAllNotesOfAProjectId')
  .get(
    auth('common'),
    NoteController.getAllimagesOrDocumentOFnoteOrTaskOrProjectByDateAndProjectId
  );

// UPLOAD PROJECT DOCUMENT  
router.route('/upload-document').post(
  auth('common'), // Allow both manager and supervisor to upload
  upload.fields([
    { name: 'attachments', maxCount: 1 },
  ]),
  ProjectController.uploadProjectDocument
);

// GET A SINGLE PROJECT BY ITS ID
router
  .route('/:projectId')
  .get(auth('projectManager'), ProjectController.getAProject);

// UPDATE A PROJECT
router
  .route('/update/:projectId')
  .put(auth('projectManager'), ProjectController.updateById);

// GET ALL PROJECTS (GENERAL)
router.route('/').get(auth('common'), ProjectController.getAllProject);

// CREATE A NEW PROJECT
router.route('/create').post(
  [
    upload.fields([
      { name: 'projectLogo', maxCount: 1 },
    ]),
  ],
  auth('projectManager'),
  ProjectController.createProject
);

// GET PROJECT ACTIVITY DATES
router
  .route('/:projectId/activity-dates')
  .get(auth('common'), ProjectController.getProjectActivityDates);

// SOFT DELETE A PROJECT
router
  .route('/soft-delete/:projectId')
  .delete(auth('projectManager'), ProjectController.softDeleteById);

export const ProjectRoutes = router;
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

// GET ALL PROJECTS FOR THE LOGGED-IN SUPERVISOR
router
  .route('/supervisor/all')
  .get(auth('projectSupervisor'), ProjectController.getAllProjectsBySupervisor);

// GET ALL PROJECTS WITH PAGINATION (FOR ADMINS/OTHER ROLES)
router
  .route('/paginate')
  .get(auth('projectManager'), ProjectController.getAllProjectWithPagination);

// GET ALL IMAGES FOR A PROJECT
router
  .route('/getAllImagesOfAllNotesOfAProjectId')
  .get(
    // ✅ DEFINITIVE FIX: Changed auth('common') to explicitly allow the correct roles.
    auth('projectManager', 'projectSupervisor'),
    NoteController.getAllimagesOrDocumentOFnoteOrTaskOrProjectByDateAndProjectId
  );

// UPLOAD PROJECT DOCUMENT  
router.route('/upload-document').post(
  auth('projectManager', 'projectSupervisor'), // Also allow supervisors to upload
  upload.fields([
    { name: 'attachments', maxCount: 1 },
  ]),
  ProjectController.uploadProjectDocument
);

// ✨ =================================================================
// ✨ NEW ROUTES FOR SUPERVISOR ASSIGNMENT
// ✨ =================================================================
// GET all supervisors that can be assigned to a specific project
router
    .route('/:projectId/assignable-supervisors')
    .get(auth('projectManager'), ProjectController.getAssignableSupervisors);

// PUT (update) the list of assigned supervisors for a project
router
    .route('/:projectId/assign-supervisors')
    .put(auth('projectManager'), ProjectController.assignSupervisorsToProject);


// GET A SINGLE PROJECT BY ITS ID
router
  .route('/:projectId')
  .get(auth('projectManager', 'projectSupervisor'), ProjectController.getAProject);

// UPDATE A PROJECT
router
  .route('/update/:projectId')
  .put(
    auth('projectManager'),
    // ✅ ADDED: Middleware to handle file upload
    upload.fields([
      { name: 'projectLogo', maxCount: 1 },
    ]),
    ProjectController.updateById
  );
  
// GET ALL PROJECTS (GENERAL)
router.route('/').get(auth('projectManager', 'projectSupervisor'), ProjectController.getAllProject);

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
  .get(auth('projectManager', 'projectSupervisor'), ProjectController.getProjectActivityDates);

// SOFT DELETE A PROJECT
router
  .route('/soft-delete/:projectId')
  .delete(auth('projectManager'), ProjectController.softDeleteById);

export const ProjectRoutes = router;

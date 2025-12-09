import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../shared/validateRequest';
import { AttachmentController } from './attachment.controller';

// import fileUploadHandler from '../../shared/fileUploadHandler';
// import convertHeicToPngMiddleware from '../../shared/convertHeicToPngMiddleware';
// const UPLOADS_FOLDER = 'uploads/users';
// const upload = fileUploadHandler(UPLOADS_FOLDER);

const router = express.Router();

// info : pagination route must be before the route with params
router
  .route('/paginate')
  .get(auth('common'), AttachmentController.getAllAttachmentWithPagination);

// ✅ All attachments (list)
router
  .route('/')
  .get(auth('common'), AttachmentController.getAllAttachment);

// ✅ Get / Update single attachment
//    - GET /api/v1/attachment/:attachmentId
//    - PUT /api/v1/attachment/:attachmentId   <-- used for rename
router
  .route('/:attachmentId')
  .get(auth('common'), AttachmentController.getAAttachment)
  .put(
    auth('projectManager', 'projectSupervisor', 'admin'),
    AttachmentController.updateById,
  );

// ✅ React toggle
router
  .route('/addOrRemoveReact/:attachmentId')
  .put(auth('common'), AttachmentController.addOrRemoveReact);

// ✅ Delete by id (already working)
router
  .route('/delete/:attachmentId')
  .delete(
    auth('projectManager', 'projectSupervisor', 'admin'),
    AttachmentController.deleteById,
  );

// ✅ Delete by file URL
router
  .route('/delete-by-file-url')
  .delete(AttachmentController.deleteByFileUrl);

export const AttachmentRoutes = router;

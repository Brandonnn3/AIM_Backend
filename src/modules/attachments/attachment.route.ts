import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../shared/validateRequest';
import { AttachmentController } from './attachment.controller';

// import fileUploadHandler from '../../shared/fileUploadHandler';
// import convertHeicToPngMiddleware from '../../shared/convertHeicToPngMiddleware';
// const UPLOADS_FOLDER = 'uploads/users';
// const upload = fileUploadHandler(UPLOADS_FOLDER);

const router = express.Router();

//info : pagination route must be before the route with params
router.route('/paginate').get(
  auth('common'),
  AttachmentController.getAllAttachmentWithPagination
);

router.route('/:attachmentId').get(
  auth('common'),
  AttachmentController.getAAttachment
);

router.route('/update/:attachmentId').put(
  auth('common'),
  // validateRequest(UserValidation.createUserValidationSchema),
  AttachmentController.updateById
);

router.route('/addOrRemoveReact/:attachmentId').put(
  auth('common'),
  // validateRequest(UserValidation.createUserValidationSchema),
  AttachmentController.addOrRemoveReact
);

router.route('/').get(
  auth('common'),
  AttachmentController.getAllAttachment
);

// router.route('/create').post(
//   auth('projectManager'),
//   // validateRequest(UserValidation.createUserValidationSchema),
//   AttachmentController.createAttachment
// );

//[🚧][🧑‍💻✅][🧪🆗] 
router.route('/delete/:attachmentId').delete(
  auth('common'),
  AttachmentController.deleteById
);

//[🚧][🧑‍💻✅][🧪🆗] 
// Working Perfectly ... 
router.route("/delete-by-file-url").delete(
  AttachmentController.deleteByFileUrl  
)


export const AttachmentRoutes = router;

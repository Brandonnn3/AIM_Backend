import express from 'express';
import { UserController } from './user.controller';
import auth from '../../middlewares/auth';
import validateRequest from '../../shared/validateRequest';
import { UserValidation } from './user.validation';
// import fileUploadHandler from '../../shared/fileUploadHandler';
// import convertHeicToPngMiddleware from '../../shared/convertHeicToPngMiddleware';
// const UPLOADS_FOLDER = 'uploads/users';
// const upload = fileUploadHandler(UPLOADS_FOLDER);

const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const router = express.Router();

//info : pagination route must be before the route with params
router
  .route('/paginate')
  .get(auth('projectManager'), UserController.getAllUserWithPagination);

router.route('/getAllManager').get(
  // auth('common'),
  UserController.getAllManager
);

router
  .route('/getAllManagerByCompanyId')
  .get(UserController.getAllManagerByCompanyId);

//[🚧][🧑‍💻✅][🧪🆗] //
// get all Projects by User Id  // :userId
router
  .route('/projects')
  .get(auth('common'), UserController.getAllProjectsByUserId);

// get all Projects by User Id  // :userId
router
  .route('/superVisors')
  .get(
    auth('projectManager'),
    UserController.getAllProjectSupervisorsByProjectManagerId
  );

router
  .route('/profile-image')
  .post(
    auth('common'),
    [upload.single('profileImage')],
    UserController.updateProfileImage
  );

router
  .route('/update-profile')
  .patch(
    auth('common'),
    [upload.single('profileImage')],
    UserController.updateProfile
  );

// sub routes must be added after the main routes
router
  .route('/profile')
  .get(auth('common'), UserController.getMyProfile)
  .patch(
    auth('common'),
    validateRequest(UserValidation.updateUserValidationSchema),
    upload.single('profile_image'),
    // convertHeicToPngMiddleware(UPLOADS_FOLDER),
    UserController.updateMyProfile
  )
  .delete(auth('common'), UserController.deleteMyProfile);

//main routes
router.route('/').get(auth('common'), UserController.getAllUsers);

router
  .route('/:userId')
  .get(auth('common'), UserController.getSingleUser)
  .put(
    auth('common'),
    validateRequest(UserValidation.updateUserValidationSchema),
    UserController.updateUserProfile
  )
  .patch(
    auth('admin'),
    validateRequest(UserValidation.changeUserStatusValidationSchema),
    UserController.updateUserStatus
  );

///////////////////////////////////////////////

router.get;

export const UserRoutes = router;

import express from 'express';
import { UserController } from './user.controller';
import auth from '../../middlewares/auth';
import validateRequest from '../../shared/validateRequest';
import { UserValidation } from './user.validation';

const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const router = express.Router();

// This endpoint allows a manager to get a list of their supervisors.
router.route('/my-supervisors').get(
  auth('projectManager'),
  UserController.getMySupervisors,
);

router.route('/invite-supervisors').post(
  auth('projectManager'),
  UserController.inviteSupervisors,
);

// NEW ROUTE: To cancel a pending invitation (deletes the user)
// The :id parameter will be the supervisor's user ID.
router.delete(
    '/invites/:id',
    auth('projectManager'),
    UserController.cancelSupervisorInvitation
);

// NEW ROUTE: To remove an active supervisor from a company
// The :id parameter will be the supervisor's user ID.
router.delete(
    '/company/supervisors/:id',
    auth('projectManager'),
    UserController.removeSupervisorFromCompany
);

// --- Other existing routes ---

router
  .route('/paginate')
  .get(auth('projectManager'), UserController.getAllUserWithPagination);

router.route('/getAllManager').get(
  UserController.getAllManager
);

router
  .route('/getAllManagerByCompanyId')
  .get(UserController.getAllManagerByCompanyId);

router
  .route('/projects')
  .get(auth('common'), UserController.getAllProjectsByUserId);

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

router
  .route('/profile')
  .get(auth('common'), UserController.getMyProfile)
  .patch(
    auth('common'),
    validateRequest(UserValidation.updateUserValidationSchema),
    upload.single('profile_image'),
    UserController.updateMyProfile
  )
  .delete(auth('common'), UserController.deleteMyProfile);

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

export const UserRoutes = router;

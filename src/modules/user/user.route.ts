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

router.delete(
    '/invites/:id',
    auth('projectManager'),
    UserController.cancelSupervisorInvitation
);

router.delete(
    '/company/supervisors/:id',
    auth('projectManager'),
    UserController.removeSupervisorFromCompany
);

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
  .get(auth('projectManager', 'projectSupervisor'), UserController.getAllProjectsByUserId);

router
  .route('/superVisors')
  .get(
    auth('projectManager'),
    UserController.getAllProjectSupervisorsByProjectManagerId
  );

router
  .route('/profile-image')
  .post(
    auth('projectManager', 'projectSupervisor'),
    [upload.single('profileImage')],
    UserController.updateProfileImage
  );

router
  .route('/update-profile/:userId')
  .put(
    auth('projectManager', 'projectSupervisor'),
    [upload.single('profileImage')],
    UserController.updateProfile
  );

router
  .route('/profile')
  .get(auth('projectManager', 'projectSupervisor'), UserController.getMyProfile)
  .patch(
    auth('projectManager', 'projectSupervisor'),
    validateRequest(UserValidation.updateUserValidationSchema),
    upload.single('profile_image'),
    UserController.updateMyProfile
  )
  .delete(auth('projectManager', 'projectSupervisor'), UserController.deleteMyProfile);

// ✅ DEFINITIVE FIX: Changed auth('common') to allow both managers and supervisors.
// This was the route causing the 403 error after login.
router.route('/').get(auth('projectManager', 'projectSupervisor'), UserController.getAllUsers);

router
  .route('/:userId')
  .get(auth('projectManager', 'projectSupervisor'), UserController.getSingleUser)
  .put(
    auth('projectManager', 'projectSupervisor'),
    validateRequest(UserValidation.updateUserValidationSchema),
    UserController.updateUserProfile
  )
  .patch(
    auth('admin'),
    validateRequest(UserValidation.changeUserStatusValidationSchema),
    UserController.updateUserStatus
  );

export const UserRoutes = router;

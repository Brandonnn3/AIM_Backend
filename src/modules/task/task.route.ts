import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../shared/validateRequest';
import { TaskController } from './task.controller';
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const router = express.Router();

//info : pagination route must be before the route with params
router.route('/paginate').get(
  // auth('projectManager'),
  TaskController.getAllTaskWithPagination
);

router.route('/:taskId').get(
  auth('projectManager', 'projectSupervisor'), // Also allow supervisors to get task details
  TaskController.getATask
);

router.route('/update/:taskId').put(
  auth('projectManager'),
  // validateRequest(UserValidation.createUserValidationSchema),
  TaskController.updateById
);

router.route('/').get(
  auth('projectManager'),
  TaskController.getAllTask
);

router.route('/create').post(
  [
    upload.fields([
      { name: 'attachments', maxCount: 15 },
    ]),
  ],
  auth('projectManager'),
  TaskController.createTask
);

router.route('/delete/:taskId').delete(
  auth('projectManager'),
  TaskController.deleteById
);


// ✅ DEFINITIVE FIX: Changed auth('common') to explicitly allow the correct roles.
// This ensures the auth middleware correctly processes the token for both managers and supervisors.
router.route('/changeStatus/:taskId').patch(
  auth('projectManager', 'projectSupervisor'), 
  TaskController.changeStatusOfATask
);

export const TaskRoutes = router;

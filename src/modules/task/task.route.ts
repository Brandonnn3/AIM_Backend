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
  auth('common'),
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
      { name: 'attachments', maxCount: 15 }, // Allow up to 5 cover photos
    ]),
  ],
  auth('projectManager'),
  // validateRequest(UserValidation.createUserValidationSchema),
  TaskController.createTask
);

router.route('/delete/:taskId').delete(
  auth('projectManager'),
  TaskController.deleteById
);


//[🚧][🧑‍💻✅][🧪🆗]
router
  .route('/changeStatus/:taskId')
  .get(auth('common'), TaskController.changeStatusOfATask);

  router
  .route('/changeStatusOfATask/:taskId')
  .get(auth('common'), TaskController.changeStatusOfATaskFix);

export const TaskRoutes = router;

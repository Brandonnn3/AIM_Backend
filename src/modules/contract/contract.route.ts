import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../shared/validateRequest';
import { ContractController } from './contract.controller';

const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


const router = express.Router();

//info : pagination route must be before the route with params
router.route('/paginate').get(
  auth('projectManager'),
  ContractController.getAllContractWithPagination
);

router.route('/:contractId').get(
  auth('projectManager'),
  ContractController.getAContract
);

router.route('/update/:contractId').put(
  auth('projectManager'),
  // validateRequest(UserValidation.createUserValidationSchema),
  ContractController.updateById
);

router.route('/').get(
  auth('projectManager'),
  ContractController.getAllContract
);

//[🚧][🧑‍💻✅][🧪🆗 ]
router.route('/create').post(
  [
    upload.fields([
      { name: 'attachments', maxCount: 15 }, // Allow up to 5 cover photos
    ]),
  ],
  auth('projectManager'),
  // validateRequest(UserValidation.createUserValidationSchema),
  ContractController.createContract
);

router.route('/delete/:contractId').delete(
  auth('projectManager'),
   ContractController.deleteById
);


export const ContractRoutes = router;

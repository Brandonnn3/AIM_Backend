import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../shared/validateRequest';
import { CompanyController } from './company.controller';

const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const router = express.Router();

//info : pagination route must be before the route with params
// router.route('/paginate').get(
//   auth('projectManager'),
//   ContractController.getAllCompanyWithPagination
// );

// router.route('/:contractId').get(
//   auth('projectManager'),
//   ContractController.getACompany
// );

router.route('/update/:contractId').put(
  auth('projectManager'),
  // validateRequest(UserValidation.createUserValidationSchema),
  CompanyController.updateById
);

router.route('/').get(auth('projectManager'), CompanyController.getAllCompany);

//[🚧][🧑‍💻✅][🧪🆗 ]
router.route('/create').post(CompanyController.createCompany);

// [🚧][🧑‍💻✅][🧪🆗 ]
router.route('/getByName').post(CompanyController.getACompanyByName);

router
  .route('/delete/:contractId')
  .delete(auth('projectManager'), CompanyController.deleteById);

export const CompanyRoutes = router;

import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../shared/validateRequest';
import { CompanyController } from './company.controller';

const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const router = express.Router();

router.route('/update/:contractId').put(
  auth('projectManager'),
  CompanyController.updateById
);

router.route('/').get(auth('projectManager'), CompanyController.getAllCompany);

// MODIFIED: Added the auth() middleware to protect this route.
router.route('/create').post(
    auth('projectManager'), 
    CompanyController.createCompany
);

// MODIFIED: Added the auth() middleware to protect this route.
router.route('/getByName').post(
    auth('projectManager'), 
    CompanyController.getACompanyByName
);

router
  .route('/delete/:contractId')
  .delete(auth('projectManager'), CompanyController.deleteById);

export const CompanyRoutes = router;

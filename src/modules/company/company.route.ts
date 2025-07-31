import express from 'express';
import auth from '../../middlewares/auth';
import { CompanyController } from './company.controller';

const router = express.Router();

// ✅ NEW: Route for a manager to get their own company's details.
router.route('/my-company').get(
    auth('projectManager'),
    CompanyController.getMyCompany
);

router.route('/setup-profile').post(
    auth('projectManager'), 
    CompanyController.setupCompanyProfile
);

// ✅ UPDATED: Changed param from :contractId to :companyId for clarity.
router.route('/update/:companyId').put(
  auth('projectManager'),
  CompanyController.updateById
);

router.route('/').get(auth('projectManager'), CompanyController.getAllCompany);

router.route('/getByName').post(
    auth('projectManager'), 
    CompanyController.getACompanyByName
);

// ✅ UPDATED: Changed param from :contractId to :companyId.
router
  .route('/delete/:companyId')
  .delete(auth('projectManager'), CompanyController.deleteById);

export const CompanyRoutes = router;

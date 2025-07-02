import express from 'express';
import auth from '../../middlewares/auth';
import { CompanyController } from './company.controller';

const router = express.Router();

// NEW: This is the endpoint for the first step of the manager onboarding wizard.
router.route('/setup-profile').post(
    auth('projectManager'), 
    CompanyController.setupCompanyProfile
);

// TODO: We will add a new route here for sending supervisor invites later.


// --- Other existing routes ---

router.route('/update/:contractId').put(
  auth('projectManager'),
  CompanyController.updateById
);

router.route('/').get(auth('projectManager'), CompanyController.getAllCompany);

router.route('/getByName').post(
    auth('projectManager'), 
    CompanyController.getACompanyByName
);

router
  .route('/delete/:contractId')
  .delete(auth('projectManager'), CompanyController.deleteById);

export const CompanyRoutes = router;

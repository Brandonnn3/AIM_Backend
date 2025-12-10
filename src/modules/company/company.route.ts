import express from 'express';
import auth from '../../middlewares/auth';
import { CompanyController } from './company.controller';
// 🔹 ADD THIS IMPORT (Adjust path if your helper is in a different folder)
import { FileUploadHelper } from '../../helpers/fileUploadHelper';

const router = express.Router();

// Route for a manager to get their own company's details.
router.route('/my-company').get(
    auth('projectManager'),
    CompanyController.getMyCompany
);

router.route('/setup-profile').post(
    auth('projectManager'), 
    CompanyController.setupCompanyProfile
);

// ✅ UPDATED: Added FileUploadHelper to process the 'logo' file
router.route('/update/:companyId').put(
  auth('projectManager'),
  FileUploadHelper.upload.single('logo'), // 👈 THIS WAS MISSING
  CompanyController.updateById
);

router.route('/').get(auth('projectManager'), CompanyController.getAllCompany);

router.route('/getByName').post(
    auth('projectManager'), 
    CompanyController.getACompanyByName
);

router
  .route('/delete/:companyId')
  .delete(auth('projectManager'), CompanyController.deleteById);

export const CompanyRoutes = router;
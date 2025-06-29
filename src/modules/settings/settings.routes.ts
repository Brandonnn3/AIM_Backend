import { Router } from 'express';
import auth from '../../middlewares/auth';
import { SettingsController } from './settings.controllers';

const router = Router();

router
  .route('/')
  .get(auth('common'), SettingsController.getDetailsByType)
  // FIXME : FormData te details send korle kaj hocche na .. raw kaj kortese
  .post(auth('projectManager'), SettingsController.createOrUpdateSettings);
export const SettingsRoutes = router;

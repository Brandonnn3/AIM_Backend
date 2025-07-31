import { Router } from 'express';
import auth from '../../middlewares/auth';
import { NotificationController } from './notification.controllers';

const router = Router();

router
  .route('/clear-all-notifications')
  .delete(auth('projectManager', 'projectSupervisor'), NotificationController.clearAllNotification);
router
  .route('/admin-notifications')
  .get(auth('admin'), NotificationController.getAdminNotifications);

// ✅ DEFINITIVE FIX: Changed auth('common') to explicitly allow the correct roles.
router
  .route('/')
  .get(auth('projectManager', 'projectSupervisor'), NotificationController.getALLNotification);

router
  .route('/:id')
  .get(auth('projectManager', 'projectSupervisor'), NotificationController.getSingleNotification)
  .patch(auth('projectManager', 'projectSupervisor'), NotificationController.viewNotification)
  .delete(auth('projectManager', 'projectSupervisor'), NotificationController.deleteNotification);

export const NotificationRoutes = router;

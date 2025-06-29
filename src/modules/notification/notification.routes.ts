import { Router } from 'express';
import auth from '../../middlewares/auth';
import { NotificationController } from './notification.controllers';

const router = Router();

router
  .route('/clear-all-notifications')
  .delete(auth('common'), NotificationController.clearAllNotification);
router
  .route('/admin-notifications')
  .get(auth('admin'), NotificationController.getAdminNotifications);
router
  .route('/')
  .get(auth('common'), NotificationController.getALLNotification);

router
  .route('/:id')
  .get(auth('common'), NotificationController.getSingleNotification)
  .patch(auth('common'), NotificationController.viewNotification)
  .delete(auth('common'), NotificationController.deleteNotification);

export const NotificationRoutes = router;

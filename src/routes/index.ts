import express from 'express';
import { UserRoutes } from '../modules/user/user.route';
import { AuthRoutes } from '../modules/auth/auth.routes';

import { ProjectRoutes } from '../modules/project/project.route';
import { NoteRoutes } from '../modules/note/note.route';

import { ContractRoutes } from '../modules/contract/contract.route';
import { TaskRoutes } from '../modules/task/task.route';
import { AttachmentRoutes } from '../modules/attachments/attachment.route';
import { NotificationRoutes } from '../modules/notification/notification.routes';
import { SettingsRoutes } from '../modules/settings/settings.routes';
import { CompanyRoutes } from '../modules/company/company.route';

const router = express.Router();

const apiRoutes = [
  {
    path: '/auth',
    route: AuthRoutes,
  },
  {
    path: '/user',
    route: UserRoutes,
  },

  ////////////////////// Newly Created

  {
    path: '/settings',
    route: SettingsRoutes,
  },
  {
    path: '/note',
    route: NoteRoutes,
  },

  {
    path: '/contract',
    route: ContractRoutes,
  },
  {
    path: '/project',
    route: ProjectRoutes,
  },
  {
    path: '/task',
    route: TaskRoutes,
  },

  {
    path: '/attachment',
    route: AttachmentRoutes,
  },
  {
    path: '/activity',
    route: NotificationRoutes,
  },
  {
    path: '/company',
    route: CompanyRoutes,
  },
];

apiRoutes.forEach(route => router.use(route.path, route.route));

export default router;

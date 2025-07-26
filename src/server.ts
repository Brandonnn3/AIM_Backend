import colors from 'colors';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import app from './app';
import { errorLogger, logger } from './shared/logger';
import { socketHelper } from './helpers/socket';
import { config } from './config';

// ✨ ADD THESE IMPORTS FOR THE SCHEDULED JOB ✨
import cron from 'node-cron';
import { ProjectService } from './modules/project/project.service';
import { NotificationService } from './modules/notification/notification.services';
import { INotification } from './modules/notification/notification.interface';
import { Types } from 'mongoose';

//uncaught exception
process.on('uncaughtException', error => {
  errorLogger.error('UnhandleException Detected', error);
  process.exit(1);
});

let server: any;
let io : Server | undefined;
async function main() {
  try {
    await mongoose.connect(config.database.mongoUrl as string);
    logger.info(colors.green('🚀 Database connected successfully'));
    const port =
      typeof config.port === 'number' ? config.port : Number(config.port);
    server = app.listen(port, config.backend.ip as string, () => {
      logger.info(
        colors.yellow(
          `♻️  Application listening on port ${config.backend.baseUrl}/v1`,
        ),
      );
    });
    //socket
     io = new Server(server, {
      pingTimeout: 60000,
      cors: {
        origin: '*',
      },
    });
    socketHelper.socket(io);
    // @ts-ignore
    global.io = io;

    // =================================================================
    // ✨ ADDED THE SCHEDULED JOB FOR DAILY DEADLINE CHECKS ✨
    // =================================================================
    // This schedule runs every day at 9:00 AM ('0 9 * * *').
    cron.schedule('0 9 * * *', async () => {
      console.log('Running daily check for project deadlines...');
      
      const projectService = new ProjectService();
      try {
        const projects = await projectService.findProjectsNearingDeadline();
        
        if (projects.length > 0) {
          console.log(`Found ${projects.length} projects with deadlines approaching.`);
          
          for (const project of projects) {
            const today = new Date();
            const endDate = new Date(project.endDate);
            const diffTime = endDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (project.projectManagerId) {
                const notificationPayload: INotification = {
                  title: `Project Deadline Nearing: '${project.projectName}' is due in ${diffDays} days.`,
                  receiverId: project.projectManagerId,
                  notificationFor: 'deadline',
                  projectId: project._id as Types.ObjectId,
                  linkId: project._id,
                  role: 'projectManager' as any,
                  isDeleted: false,
                };
                await NotificationService.addNotification(notificationPayload);
            }
          }
        } else {
          console.log('No projects with approaching deadlines found today.');
        }
      } catch (error) {
        console.error('Error during daily deadline check:', error);
      }
    }, {
      scheduled: true,
      timezone: "America/New_York" // Adjust to your server's timezone
    });
    // =================================================================
    // END OF SCHEDULED JOB BLOCK
    // =================================================================

  } catch (error) {
    errorLogger.error(colors.red('🤢 Failed to connect Database'));
  }

  //handle unhandledRejection
  process.on('unhandledRejection', error => {
    if (server) {
      server.close(() => {
        errorLogger.error('UnhandledRejection Detected', error);
        process.exit(1);
      });
    } else {
      process.exit(1);
    }
  });
}

main();

export {io};
//SIGTERM
// process.on('SIGTERM', () => {
//   logger.info('SIGTERM IS RECEIVE');
//   if (server) {
//     server.close();
//   }
// });

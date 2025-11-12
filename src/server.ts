import colors from 'colors';
import mongoose, { Types } from 'mongoose';
import { Server } from 'socket.io';
import app from './app';
import { errorLogger, logger } from './shared/logger';
import { socketHelper } from './helpers/socket';
import dotenv from 'dotenv';
dotenv.config();

import cron from 'node-cron';
import { ProjectService } from './modules/project/project.service';
import { NotificationService } from './modules/notification/notification.services';
import { INotification } from './modules/notification/notification.interface';

// ---------------------------
// Uncaught exception (sync)
// ---------------------------
process.on('uncaughtException', error => {
  errorLogger.error('UncaughtException detected', error);
  process.exit(1);
});

let server: any;
let io: Server | undefined;

async function main() {
  try {
    // ---------------------------
    // MongoDB connection
    // ---------------------------
    const mongoUrl = process.env.MONGODB_URL;
    if (!mongoUrl) {
      throw new Error('MONGODB_URL is not defined in environment variables');
    }

    // Do NOT log the full URI (contains credentials) — print masked for sanity check
    logger.info('Connecting to MongoDB Atlas...');
    try {
      const raw = process.env.MONGODB_URL || '';
      const masked = raw.replace(
        /(mongodb\+srv:\/\/)([^:]+):([^@]+)@/,
        (_m, p, user) => `${p}${user}:***@`
      );
      logger.info(`Mongo URI (masked): ${masked}`);
    } catch {}

    await mongoose.connect(mongoUrl); // Atlas works without custom TLS options
    logger.info(colors.green('🚀 Database connected successfully'));

    // ---------------------------
    // HTTP server (Render port)
    // ---------------------------
    const PORT = Number(process.env.PORT) || 6731; // fallback for local dev
    const HOST = '0.0.0.0'; // required for Render

    server = app.listen(PORT, HOST, () => {
      logger.info(colors.yellow(`♻️  Application listening on port ${PORT}`));
    });

    // ---------------------------
    // Socket.io
    // ---------------------------
    io = new Server(server, {
      pingTimeout: 60000,
      cors: { origin: '*' },
    });
    socketHelper.socket(io);
    // @ts-ignore
    global.io = io;

    // ---------------------------
    // Scheduled daily job (09:00 America/New_York)
    // ---------------------------
    cron.schedule(
      '0 9 * * *',
      async () => {
        try {
          logger.info('Running daily check for project deadlines...');
          const projectService = new ProjectService();
          const projects = await projectService.findProjectsNearingDeadline();

          if (projects.length > 0) {
            logger.info(`Found ${projects.length} projects with approaching deadlines.`);

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
            logger.info('No projects with approaching deadlines found today.');
          }
        } catch (err) {
          errorLogger.error('Error during daily deadline check', err);
        }
      },
      { scheduled: true, timezone: 'America/New_York' }
    );

  } catch (error) {
    errorLogger.error(colors.red('🤢 Failed to start server'), error);
    process.exit(1);
  }

  // ---------------------------
  // Unhandled promise rejections
  // ---------------------------
  process.on('unhandledRejection', error => {
    if (server) {
      server.close(() => {
        errorLogger.error('UnhandledRejection detected', error);
        process.exit(1);
      });
    } else {
      process.exit(1);
    }
  });

  // (Optional) graceful shutdown on SIGTERM/SIGINT
  const shutdown = (signal: string) => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    if (server) {
      server.close(() => {
        logger.info('HTTP server closed.');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main();

export { io };

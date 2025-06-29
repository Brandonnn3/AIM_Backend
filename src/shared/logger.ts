import path from 'path';
import DailyRotateFile from 'winston-daily-rotate-file';
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, printf } = format;

const myFormat = printf(
  ({
    level,
    message,
    label,
    timestamp,
  }: {
    level: string;
    message: string;
    label: string;
    timestamp: Date;
  }) => {
    const date = new Date(timestamp);
    const hour = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();

    return `${date.toDateString()} ${hour}:${minutes}:${seconds} [${label}] ${level}: ${message}`;
  }
);

const logger = createLogger({
  level: 'info',
  format: combine(label({ label: 'SERVER-NAME' }), timestamp(), myFormat),
  transports: [
    new transports.Console(),
    new DailyRotateFile({
      filename: path.join(
        process.cwd(),
        'winston',
        'success',
        '%DATE%-success.log'
      ),
      datePattern: 'YYYY-MM-DD', // Ensure one file per day // rakib vai jevabe korsilo ... DD-MM-YYYY-HH
      zippedArchive: true, // Archive old logs
      maxSize: '20m',
      maxFiles: '1d',
    }),
  ],
});

const errorLogger = createLogger({
  level: 'error',
  format: combine(label({ label: 'Lock Smit' }), timestamp(), myFormat),
  transports: [
    new transports.Console(),
    new DailyRotateFile({
      filename: path.join(
        process.cwd(),
        'winston',
        'error',
        '%DATE%-error.log'
      ),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true, // Archive old logs
      maxSize: '20m',
      maxFiles: '1d',
    }),
  ],
});

// // Override console.log
// const originalConsoleLog = console.log;
// console.log = (...args) => {
//   logger.info(args.join(' ')); // Redirect console.log to Winston's info level
//   originalConsoleLog(...args); // Optionally preserve the original console.log behavior
// };

// // Override console.error
// const originalConsoleError = console.error;
// console.error = (...args) => {
//   errorLogger.error(args.join(' ')); // Redirect console.error to Winston's error level
//   originalConsoleError(...args); // Optionally preserve the original console.error behavior
// };

// // Override console.warn
// const originalConsoleWarn = console.warn;
// console.warn = (...args) => {
//   logger.warn(args.join(' ')); // Redirect console.warn to Winston's warn level
//   originalConsoleWarn(...args); // Optionally preserve the original console.warn behavior
// };

export { errorLogger, logger };


import { createLogger, format, transports } from "winston"
const { combine, timestamp, printf } = format
import { config } from "../config";
import path from "path";

// const logDir = config.logDir
// const logFile = path.join(logDir, 'app.log')

const myFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level}]: ${message}`;

});



const logger = createLogger({
  level: 'info', // set lowest log level to output
  format: combine(timestamp(), myFormat),
  defaultMeta: { service: 'user-service' },
  exitOnError: false,
  transports: [
    new transports.Console(),
    //
    // - Write all logs with importance level of `info` or higher to `combined.log`
    //   (i.e., fatal, error, warn, and info, but not trace)
    //
    new transports.File({ 
      filename: 'app.log',
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5 
    }),
  ],
});

logger.info("yo here's some info")


export default logger;


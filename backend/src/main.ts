import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

// ✅ Winston Logger 설정 (로그 rotation 포함)
const createWinstonLogger = () => {
  const logDir = process.env.LOG_DIR || 'logs';

  // 파일 로깅용 transport (일별 rotation)
  const fileTransport = new winston.transports.DailyRotateFile({
    dirname: logDir,
    filename: 'app-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: '100m',  // 파일당 최대 100MB
    maxFiles: '30d',  // 30일 보관
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
    ),
  });

  // 에러 전용 파일 로깅
  const errorTransport = new winston.transports.DailyRotateFile({
    dirname: logDir,
    filename: 'error-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxSize: '50m',
    maxFiles: '30d',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
    ),
  });

  // 콘솔 로깅
  const consoleTransport = new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.timestamp({ format: 'HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, message, context }) => {
        return `${timestamp} [${context || 'App'}] ${level}: ${message}`;
      }),
    ),
  });

  const transports: winston.transport[] = [consoleTransport];

  // 프로덕션 또는 LOG_TO_FILE=true인 경우 파일 로깅 활성화
  if (process.env.NODE_ENV === 'production' || process.env.LOG_TO_FILE === 'true') {
    transports.push(fileTransport, errorTransport);
  }

  return WinstonModule.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    transports,
  });
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: createWinstonLogger(),  // ✅ Winston Logger 사용
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`🚀 Trading Backend running on http://localhost:${port}`);
  console.log(`📝 Log level: ${process.env.LOG_LEVEL || 'info'}`);
  console.log(`📂 Log files: ${process.env.LOG_TO_FILE === 'true' || process.env.NODE_ENV === 'production' ? 'enabled' : 'disabled'}`);
}

bootstrap();



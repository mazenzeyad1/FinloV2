import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app/app.module';
import { AppExceptionFilter } from './common/errors/app-exception.filter';

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
];

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new ExpressAdapter());

  // Exception filter
  const httpAdapter = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AppExceptionFilter(httpAdapter));

  // CORS — raw middleware so preflight is handled before anything else touches the response
  app.use((req: any, res: any, next: any) => {
    const origin = req.headers.origin;
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,Accept,Origin,X-Requested-With');
    res.setHeader('Access-Control-Max-Age', '3600');
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    next();
  });

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // API prefix
  app.setGlobalPrefix('api');

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Finlo API')
    .setDescription('Personal Finance Management API')
    .setVersion('1.0')
    .addTag('auth', 'Authentication endpoints')
    .addTag('accounts', 'Account management')
    .addTag('transactions', 'Transaction management')
    .addTag('budgets', 'Budget management')
    .addTag('goals', 'Financial goals')
    .addTag('transfers', 'Money transfers')
    .addTag('connections', 'External connections (Plaid)')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = Number(process.env.PORT) || 3000;

  try {
    await app.listen(port);
  } catch (err: any) {
    if (err.code === 'EADDRINUSE') {
      console.log(`⚠️  Port ${port} in use — killing existing process and retrying...`);
      await killPort(port);
      await new Promise((r) => setTimeout(r, 500));
      await app.listen(port);
    } else {
      throw err;
    }
  }

  console.log(`✅ Finlo backend running on http://localhost:${port}`);
  console.log(`📚 API available at http://localhost:${port}/api`);
  console.log(`📖 Swagger docs at http://localhost:${port}/api/docs`);
}

function killPort(port: number): Promise<void> {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    const cmd = process.platform === 'win32'
      ? `powershell -Command "Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"`
      : `lsof -ti tcp:${port} | xargs kill -9`;
    exec(cmd, () => resolve());
  });
}

bootstrap();

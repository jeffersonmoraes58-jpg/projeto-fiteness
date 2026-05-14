import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import * as compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { TransformInterceptor } from './interceptors/transform.interceptor';
import { LoggingInterceptor } from './interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 4000);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  app.use(helmet({ crossOriginEmbedderPolicy: false }));
  app.use(compression());

  app.enableCors({
    origin: configService.get('CORS_ORIGINS', 'http://localhost:3000').split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.setGlobalPrefix('api/v1');
  app.useWebSocketAdapter(new IoAdapter(app));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor(), new LoggingInterceptor());

  if (nodeEnv !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('FitSaaS API')
      .setDescription('API completa para plataforma SaaS Fitness')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Autenticação e autorização')
      .addTag('users', 'Gestão de usuários')
      .addTag('trainers', 'Personal trainers')
      .addTag('nutritionists', 'Nutricionistas')
      .addTag('students', 'Alunos')
      .addTag('workouts', 'Treinos')
      .addTag('exercises', 'Exercícios')
      .addTag('diets', 'Dietas')
      .addTag('nutrition', 'Nutrição')
      .addTag('chat', 'Chat em tempo real')
      .addTag('notifications', 'Notificações')
      .addTag('payments', 'Pagamentos')
      .addTag('progress', 'Evolução')
      .addTag('goals', 'Metas')
      .addTag('challenges', 'Desafios')
      .addTag('ai', 'Inteligência Artificial')
      .addTag('admin', 'Painel administrativo')
      .addTag('tenants', 'Multi-tenant')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  await app.listen(port);
  console.log(`\n🚀 FitSaaS API running on: http://localhost:${port}/api/v1`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api/docs\n`);
}

bootstrap();

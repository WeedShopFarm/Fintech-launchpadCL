import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private configService: NestConfigService) {}

  get nodeEnv(): string {
    return this.configService.get<string>('NODE_ENV', 'development');
  }

  get port(): number {
    return this.configService.get<number>('PORT', 3000);
  }

  get appUrl(): string {
    return this.configService.get<string>('APP_URL', 'http://localhost:3000');
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  // Database config
  get databaseUrl(): string {
    return this.configService.get<string>('DATABASE_URL');
  }

  get databaseHost(): string {
    return this.configService.get<string>('DATABASE_HOST', 'localhost');
  }

  get databasePort(): number {
    return this.configService.get<number>('DATABASE_PORT', 5432);
  }

  get databaseUsername(): string {
    return this.configService.get<string>('DATABASE_USERNAME', 'postgres');
  }

  get databasePassword(): string {
    return this.configService.get<string>('DATABASE_PASSWORD', 'postgres');
  }

  get databaseName(): string {
    return this.configService.get<string>('DATABASE_NAME', 'autocollect');
  }

  get databasePoolSize(): number {
    return this.configService.get<number>('DATABASE_POOL_SIZE', 20);
  }

  get databaseSynchronize(): boolean {
    return this.configService.get<boolean>('DATABASE_SYNCHRONIZE', false);
  }

  get databaseLogging(): boolean {
    return this.configService.get<boolean>('DATABASE_LOGGING', false);
  }

  // Redis config
  get redisUrl(): string {
    return this.configService.get<string>('REDIS_URL', 'redis://localhost:6379');
  }

  // JWT config
  get jwtSecret(): string {
    return this.configService.get<string>('JWT_SECRET');
  }

  get jwtRefreshSecret(): string {
    return this.configService.get<string>('JWT_REFRESH_SECRET');
  }

  get jwtExpiresIn(): string {
    return this.configService.get<string>('JWT_EXPIRES_IN', '15m');
  }

  get jwtRefreshExpiresIn(): string {
    return this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
  }

  // Stripe config
  get stripeSecretKey(): string {
    return this.configService.get<string>('STRIPE_SECRET_KEY');
  }

  get stripePublishableKey(): string {
    return this.configService.get<string>('STRIPE_PUBLISHABLE_KEY');
  }

  get stripeWebhookSecret(): string {
    return this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
  }

  get stripeApiVersion(): string {
    return this.configService.get<string>('STRIPE_API_VERSION', '2024-04-10');
  }

  // Yapily config
  get yapilyApplicationId(): string {
    return this.configService.get<string>('YAPILY_APPLICATION_ID');
  }

  get yapilySecretKey(): string {
    return this.configService.get<string>('YAPILY_SECRET_KEY');
  }

  get yapilyEnvironment(): string {
    return this.configService.get<string>('YAPILY_ENVIRONMENT', 'sandbox');
  }

  get yapilyCallbackUrl(): string {
    return this.configService.get<string>('YAPILY_CALLBACK_URL');
  }

  get yapilyApiVersion(): string {
    return this.configService.get<string>('YAPILY_API_VERSION', 'v2.3');
  }

  // GoCardless config
  get gocardlessAccessToken(): string {
    return this.configService.get<string>('GOCARDLESS_ACCESS_TOKEN');
  }

  get gocardlessEnvironment(): string {
    return this.configService.get<string>('GOCARDLESS_ENVIRONMENT', 'sandbox');
  }

  get gocardlessWebhookSecret(): string {
    return this.configService.get<string>('GOCARDLESS_WEBHOOK_SECRET');
  }

  get gocardlessCreditorId(): string {
    return this.configService.get<string>('GOCARDLESS_CREDITOR_ID');
  }

  // Wise config
  get wiseApiKey(): string {
    return this.configService.get<string>('WISE_API_KEY');
  }

  get wiseProfileId(): string {
    return this.configService.get<string>('WISE_PROFILE_ID');
  }

  // Encryption config
  get encryptionKey(): string {
    return this.configService.get<string>('ENCRYPTION_KEY');
  }

  // Rate limiting config
  get rateLimitWindowMs(): number {
    return this.configService.get<number>('RATE_LIMIT_WINDOW_MS', 900000);
  }

  get rateLimitMaxRequests(): number {
    return this.configService.get<number>('RATE_LIMIT_MAX_REQUESTS', 100);
  }

  // Logging config
  get logLevel(): string {
    return this.configService.get<string>('LOG_LEVEL', 'debug');
  }

  get logFormat(): string {
    return this.configService.get<string>('LOG_FORMAT', 'pretty');
  }

  // CORS config
  get corsOrigin(): string[] {
    const origins = this.configService.get<string>('CORS_ORIGIN', 'http://localhost:3000');
    return origins.split(',');
  }
}

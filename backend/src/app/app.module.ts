import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from '../common/prisma/prisma.module';
import { MailerModule } from '../common/mailer/mailer.module';
import { LoggerModule } from '../common/logger/logger.module';
import { RequestLoggingMiddleware } from '../common/logger/request-logging.middleware';
import { PlaidModule } from '../providers/plaid/plaid.module';
import { ThrottleConfigModule } from '../common/throttle/throttle.module';
import { HealthModule } from '../health/health.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { ConnectionsModule } from '../connections/connections.module';
import { AccountsModule } from '../accounts/accounts.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { BudgetsModule } from '../budgets/budgets.module';
import { GoalsModule } from '../goals/goals.module';
import { TransfersModule } from '../transfers/transfers.module';
import { InvestmentsModule } from '../investments/investments.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottleConfigModule,
    LoggerModule,
    HealthModule,
    PrismaModule, MailerModule, PlaidModule, AuthModule, UsersModule,
    ConnectionsModule, AccountsModule, TransactionsModule,
    BudgetsModule, GoalsModule, TransfersModule,
    InvestmentsModule, NotificationsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggingMiddleware).forRoutes('*');
  }
}

import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../modules/prisma/prisma.service';

const METHOD_MAP: Record<string, string> = {
  POST: 'CREATE',
  PUT: 'UPDATE',
  PATCH: 'UPDATE',
  DELETE: 'DELETE',
};

const SKIP_PREFIXES = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/google',
  '/billing/webhook',
  '/chat/socket',
  '/notifications/unread',
  '/chat/unread',
];

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Audit');

  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url, ip, headers, user, params, body } = req;

    const action = METHOD_MAP[method];
    if (!action) return next.handle();

    const path = url.split('?')[0];
    if (SKIP_PREFIXES.some((p) => path.endsWith(p))) return next.handle();

    const segments = path.split('/').filter(Boolean);
    const resource = segments[1] || segments[0] || 'unknown';
    const resourceId = params?.id || params?.studentUserId || params?.invoiceId || null;
    const userAgent = headers['user-agent'] || '';
    const clientIp = ip?.replace('::ffff:', '') || '';

    return next.handle().pipe(
      tap((responseData) => {
        const res = context.switchToHttp().getResponse();
        if (res.statusCode >= 400) return;

        const resolvedId = resourceId || responseData?.id || responseData?.data?.id || null;

        this.prisma.auditLog
          .create({
            data: {
              userId: user?.id || null,
              action,
              resource,
              resourceId: resolvedId ? String(resolvedId) : null,
              data: body && Object.keys(body).length > 0 ? body : undefined,
              ipAddress: clientIp,
              userAgent,
            },
          })
          .catch((err) => this.logger.warn(`Failed to write audit log: ${err.message}`));
      }),
    );
  }
}

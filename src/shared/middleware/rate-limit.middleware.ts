import { Elysia } from 'elysia';

import { TooManyRequestsException } from '../exceptions';
import { memoryStore } from '../infrastructure/rate-limiter';

import type { RateLimitStore } from '../infrastructure/rate-limiter';
import type { AuthenticatedUser } from '../types/context';

export interface RateLimitConfig {
  limit: number;
  windowMs: number;
  keyGenerator: 'ip' | 'user';
}

export interface RateLimitRule {
  pattern: RegExp;
  method?: string;
  config: RateLimitConfig;
}

const ONE_MINUTE = 60_000;

export const defaultRateLimitRules: RateLimitRule[] = [
  {
    pattern: /^\/api\/app\/init$/,
    method: 'POST',
    config: { limit: 10, windowMs: ONE_MINUTE, keyGenerator: 'ip' },
  },
  {
    pattern: /^\/api\/rates\/.*/,
    config: { limit: 120, windowMs: ONE_MINUTE, keyGenerator: 'user' },
  },
  {
    pattern: /^\/api\/converter\/calculate$/,
    config: { limit: 60, windowMs: ONE_MINUTE, keyGenerator: 'user' },
  },
  {
    pattern: /^\/api\/users\/me\/tracked$/,
    config: { limit: 30, windowMs: ONE_MINUTE, keyGenerator: 'user' },
  },
  {
    pattern: /^\/api\/subscriptions\/.*/,
    config: { limit: 10, windowMs: ONE_MINUTE, keyGenerator: 'user' },
  },
];

function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function findMatchingRule(
  path: string,
  method: string,
  rules: RateLimitRule[],
): RateLimitRule | null {
  for (const rule of rules) {
    if (rule.pattern.test(path)) {
      if (!rule.method || rule.method.toUpperCase() === method.toUpperCase()) {
        return rule;
      }
    }
  }
  return null;
}

export interface RateLimitMiddlewareOptions {
  rules?: RateLimitRule[];
  store?: RateLimitStore;
}

export const rateLimitMiddleware = (options: RateLimitMiddlewareOptions = {}) => {
  const rules = options.rules ?? defaultRateLimitRules;
  const store = options.store ?? memoryStore;

  return (app: Elysia) =>
    app.derive(({ request, ...ctx }) => {
      const url = new URL(request.url);
      const path = url.pathname;
      const method = request.method;

      const rule = findMatchingRule(path, method, rules);
      if (!rule) {
        return {};
      }

      const { limit, windowMs, keyGenerator } = rule.config;

      let key: string;
      if (keyGenerator === 'ip') {
        key = `ratelimit:ip:${getClientIp(request)}:${path}`;
      } else {
        const user = (ctx as { user?: AuthenticatedUser }).user;
        if (!user) {
          return {};
        }
        key = `ratelimit:user:${user.id}:${path}`;
      }

      const { count, resetAt } = store.increment(key, windowMs);

      if (count > limit) {
        const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
        throw new TooManyRequestsException('errors.rate_limit_exceeded', undefined, { retryAfter });
      }

      return {};
    });
};

import type { Request } from 'express';

export interface JwtPayload {
  sub: string;
}

// Request once the JwtAuthGuard has attached the decoded payload.
export interface AuthedRequest extends Request {
  user: JwtPayload;
}

// Request with cookies populated by the cookie-parser middleware.
export interface RequestWithCookies extends Request {
  cookies: Record<string, string>;
}

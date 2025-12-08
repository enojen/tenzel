import { config } from '../../../config';

export interface JwtPayload {
  userId: string;
  deviceId: string;
  iat: number;
}

interface SignPayload {
  userId: string;
  deviceId: string;
}

function base64UrlEncode(data: string): string {
  return Buffer.from(data).toString('base64url');
}

function base64UrlDecode(data: string): string {
  return Buffer.from(data, 'base64url').toString('utf8');
}

async function createSignature(input: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(input));
  return Buffer.from(signature).toString('base64url');
}

async function verifySignature(input: string, signature: string, secret: string): Promise<boolean> {
  const expectedSignature = await createSignature(input, secret);
  return signature === expectedSignature;
}

export interface JwtService {
  sign(payload: SignPayload): Promise<string>;
  verify(token: string): Promise<JwtPayload | null>;
}

export const jwtService: JwtService = {
  async sign(payload: SignPayload): Promise<string> {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);

    const jwtPayload: JwtPayload = {
      userId: payload.userId,
      deviceId: payload.deviceId,
      iat: now,
    };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(jwtPayload));
    const signatureInput = `${encodedHeader}.${encodedPayload}`;

    const signature = await createSignature(signatureInput, config.security.jwtSecret);

    return `${signatureInput}.${signature}`;
  },

  async verify(token: string): Promise<JwtPayload | null> {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const encodedHeader = parts[0]!;
      const encodedPayload = parts[1]!;
      const signature = parts[2]!;
      const signatureInput = `${encodedHeader}.${encodedPayload}`;

      const isValid = await verifySignature(signatureInput, signature, config.security.jwtSecret);
      if (!isValid) {
        return null;
      }

      const payload = JSON.parse(base64UrlDecode(encodedPayload)) as JwtPayload;

      if (!payload.userId || !payload.deviceId || typeof payload.iat !== 'number') {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  },
};

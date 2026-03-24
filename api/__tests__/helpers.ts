/**
 * Helpers for creating mock VercelRequest / VercelResponse objects in tests.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { EventEmitter } from 'events';

export function mockRequest(overrides: {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  query?: Record<string, string>;
} = {}): VercelRequest {
  const emitter = new EventEmitter();
  return {
    method: overrides.method || 'POST',
    body: overrides.body || {},
    headers: {
      origin: 'https://dtflayout.com',
      ...(overrides.headers || {}),
    },
    query: overrides.query || {},
    on: emitter.on.bind(emitter),
  } as unknown as VercelRequest;
}

export function mockResponse(): VercelResponse & {
  _status: number;
  _json: any;
  _headers: Record<string, string>;
  _ended: boolean;
} {
  const res: any = {
    _status: 200,
    _json: null,
    _headers: {},
    _ended: false,
  };

  res.status = (code: number) => { res._status = code; return res; };
  res.json = (data: any) => { res._json = data; res._ended = true; return res; };
  res.end = () => { res._ended = true; return res; };
  res.setHeader = (key: string, value: string) => { res._headers[key] = value; return res; };

  return res as VercelResponse & typeof res;
}

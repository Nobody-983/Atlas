import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getApiBase } from '../src/lib/api.js';

describe('ATLAS Frontend API Base URL Configuration', () => {
  const originalEnv = { ...import.meta.env };
  const originalLocation = window.location;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    // Restore window.location and env
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    });
    // @ts-ignore
    import.meta.env.VITE_API_URL = originalEnv.VITE_API_URL;
    // @ts-ignore
    import.meta.env.VITE_BACKEND_URL = originalEnv.VITE_BACKEND_URL;
  });

  it('resolves explicit VITE_API_URL without trailing /api/v1 correctly', () => {
    // @ts-ignore
    import.meta.env.VITE_API_URL = 'https://custom-api.blaaiz.net';
    expect(getApiBase()).toBe('https://custom-api.blaaiz.net/api/v1');
  });

  it('avoids duplicating /api/v1 when VITE_API_URL already contains /api/v1', () => {
    // @ts-ignore
    import.meta.env.VITE_API_URL = 'https://custom-api.blaaiz.net/api/v1';
    expect(getApiBase()).toBe('https://custom-api.blaaiz.net/api/v1');
  });

  it('strips trailing slashes when normalizing VITE_API_URL', () => {
    // @ts-ignore
    import.meta.env.VITE_API_URL = 'https://custom-api.blaaiz.net/api/v1/';
    expect(getApiBase()).toBe('https://custom-api.blaaiz.net/api/v1');
  });

  it('routes to Render backend https://atlas-fa5m.onrender.com/api/v1 when running on production Vercel', () => {
    // @ts-ignore
    delete import.meta.env.VITE_API_URL;
    // @ts-ignore
    delete import.meta.env.VITE_BACKEND_URL;

    Object.defineProperty(window, 'location', {
      writable: true,
      value: {
        hostname: 'atlas-ten-ashy-16.vercel.app',
        origin: 'https://atlas-ten-ashy-16.vercel.app',
      },
    });

    expect(getApiBase()).toBe('https://atlas-fa5m.onrender.com/api/v1');
  });

  it('routes to Render backend when running on any Vercel preview deployment', () => {
    // @ts-ignore
    delete import.meta.env.VITE_API_URL;
    // @ts-ignore
    delete import.meta.env.VITE_BACKEND_URL;

    Object.defineProperty(window, 'location', {
      writable: true,
      value: {
        hostname: 'atlas-preview-git-feature.vercel.app',
        origin: 'https://atlas-preview-git-feature.vercel.app',
      },
    });

    expect(getApiBase()).toBe('https://atlas-fa5m.onrender.com/api/v1');
  });

  it('keeps relative /api/v1 during local development on localhost for Vite proxy', () => {
    // @ts-ignore
    delete import.meta.env.VITE_API_URL;
    // @ts-ignore
    delete import.meta.env.VITE_BACKEND_URL;

    Object.defineProperty(window, 'location', {
      writable: true,
      value: {
        hostname: 'localhost',
        origin: 'http://localhost:5180',
      },
    });

    expect(getApiBase()).toBe('/api/v1');
  });

  it('keeps relative /api/v1 when served directly on Render backend domain', () => {
    // @ts-ignore
    delete import.meta.env.VITE_API_URL;
    // @ts-ignore
    delete import.meta.env.VITE_BACKEND_URL;

    Object.defineProperty(window, 'location', {
      writable: true,
      value: {
        hostname: 'atlas-fa5m.onrender.com',
        origin: 'https://atlas-fa5m.onrender.com',
      },
    });

    expect(getApiBase()).toBe('/api/v1');
  });
});

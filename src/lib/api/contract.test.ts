import { describe, expect, it } from 'vitest';

import { handlers } from '@/mocks/handlers';

import { ENDPOINTS, matchEndpoint, pathFor, routePattern, type EndpointSpec } from './contract';
import { API_ROUTES } from './routes';

const specs = Object.entries(ENDPOINTS) as [string, EndpointSpec][];
/** Endpoints the backend serves (BFF-only routes exist on the Next server only). */
const backendSpecs = specs.filter(([, spec]) => !spec.bffOnly);
const API_PATTERN = '*/api';

function mockRoutes(): { method: string; path: string }[] {
  return handlers.map((handler) => ({
    method: String(handler.info.method),
    path: String(handler.info.path),
  }));
}

describe('pathFor', () => {
  it('fills and encodes path parameters', () => {
    expect(pathFor('/candidates/{id}', { id: 'c 1/2' })).toBe('/candidates/c%201%2F2');
    expect(pathFor('/election')).toBe('/election');
  });

  it('throws when a parameter is missing', () => {
    expect(() => pathFor('/admin/election/{action}')).toThrow(/action/);
  });
});

describe('routePattern', () => {
  it('turns {name} into :name', () => {
    expect(routePattern('/admin/election/{action}')).toBe('/admin/election/:action');
  });
});

describe('endpoint registry', () => {
  it('declares every path parameter and nothing else', () => {
    for (const [name, spec] of specs) {
      const inPath = [...spec.path.matchAll(/\{(\w+)\}/g)].map((match) => match[1]);
      expect(inPath.sort(), name).toEqual(Object.keys(spec.params ?? {}).sort());
    }
  });

  it('has unique method + path pairs', () => {
    const keys = specs.map(([, spec]) => `${spec.method} ${spec.path}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('gives a body only to writes and a response, stream or file to every endpoint', () => {
    for (const [name, spec] of specs) {
      if (spec.body || spec.multipart) expect(spec.method, name).not.toBe('GET');
      const answers =
        spec.response !== null ||
        spec.stream !== undefined ||
        spec.file !== undefined ||
        spec.status === 204;
      expect(answers, name).toBe(true);
    }
  });

  it('agrees with the schema-free route table the browser uses', () => {
    expect(API_ROUTES.streamDisplay.event).toBe(ENDPOINTS.streamDisplay.stream.event);
    expect(API_ROUTES.streamAdmin.event).toBe(ENDPOINTS.streamAdmin.stream.event);
    expect(API_ROUTES.uploadCandidatePhoto.multipart).toBe(
      ENDPOINTS.uploadCandidatePhoto.multipart,
    );
    expect(Object.keys(API_ROUTES)).toEqual(Object.keys(ENDPOINTS));
  });

  it('finds the entry for a concrete request path', () => {
    expect(matchEndpoint('PUT', '/admin/candidates/12/photo')?.name).toBe('uploadCandidatePhoto');
    expect(matchEndpoint('get', '/admin/candidates/12')?.name).toBe('getAdminCandidate');
    expect(matchEndpoint('POST', '/admin/election/open')?.name).toBe('changeElectionState');
    expect(matchEndpoint('GET', '/admin/candidates/12/photo')).toBeUndefined();
    expect(matchEndpoint('GET', '/nope')).toBeUndefined();
  });
});

describe('mock handlers follow the registry', () => {
  it('has a handler with the same method and path for every endpoint', () => {
    const routes = mockRoutes();
    for (const [name, spec] of backendSpecs) {
      expect(routes, name).toContainEqual({
        method: spec.method,
        path: `${API_PATTERN}${routePattern(spec.path)}`,
      });
    }
  });

  it('serves nothing outside the registry except the mock control endpoints', () => {
    const known = new Set(
      backendSpecs.map(([, spec]) => `${spec.method} ${API_PATTERN}${routePattern(spec.path)}`),
    );
    const extra = mockRoutes()
      .map((route) => `${route.method} ${route.path}`)
      .filter((key) => !known.has(key) && !key.includes('/__mock/'));
    expect(extra).toEqual([]);
  });
});

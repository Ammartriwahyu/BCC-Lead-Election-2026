/**
 * src/lib/api/contract.ts (endpoint registry + Zod schemas) -> docs/openapi.json (OpenAPI 3.1).
 * Describes the backend API exactly as the frontend uses it (Bearer auth, /api paths). Routes that
 * only exist on the Next server (bffOnly) are left out. Regenerate after every contract change.
 *
 * Usage: pnpm contract:openapi          (write)
 *        pnpm contract:openapi --check  (CI: fail if docs/openapi.json is stale)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import * as z from 'zod/mini';

import {
  ENDPOINTS,
  ERROR_STATUS,
  type EndpointName,
  type EndpointSpec,
} from '../src/lib/api/contract';
import { ENDPOINT_SUMMARIES } from '../src/lib/api/contractDocs';
import { errorBodySchema } from '../src/lib/api/schemas';

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type JsonObject = { [key: string]: Json };

const OUT = join(import.meta.dirname, '..', 'docs', 'openapi.json');
const pkg = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'package.json'), 'utf8')) as {
  version: string;
};

/** JSON Schema of what travels on the wire (the input side of our parsers). */
function schemaOf(schema: z.core.$ZodType): JsonObject {
  return tidy(z.toJSONSchema(schema, { io: 'input' }) as Json) as JsonObject;
}

/** Drops noise that does not help a reader: $schema, MAX_SAFE_INTEGER bounds, date-time regexes. */
function tidy(node: Json): Json {
  if (Array.isArray(node)) return node.map(tidy);
  if (node === null || typeof node !== 'object') return node;
  const out: JsonObject = {};
  for (const [key, value] of Object.entries(node)) {
    if (key === '$schema') continue;
    if (key === 'maximum' && value === Number.MAX_SAFE_INTEGER) continue;
    if (key === 'minimum' && value === Number.MIN_SAFE_INTEGER) continue;
    if (key === 'pattern' && node.format === 'date-time') continue;
    out[key] = tidy(value);
  }
  return out;
}

const json = (schema: JsonObject | { $ref: string }) => ({
  'application/json': { schema },
});

const ERROR_REF = { $ref: '#/components/schemas/Error' };

function errorResponses(spec: EndpointSpec): JsonObject {
  const codes = [...spec.errors];
  if (spec.auth !== 'public') codes.unshift('UNAUTHORIZED', 'FORBIDDEN');
  const byStatus = new Map<number, string[]>();
  for (const code of codes) {
    const status = ERROR_STATUS[code];
    if (status === undefined) throw new Error(`No HTTP status for error code ${code}`);
    byStatus.set(status, [...(byStatus.get(status) ?? []), code]);
  }
  const out: JsonObject = {};
  for (const [status, list] of [...byStatus].sort(([a], [b]) => a - b)) {
    out[String(status)] = { description: list.join(' | '), content: json(ERROR_REF) };
  }
  return out;
}

function tagOf(spec: EndpointSpec): 'committee' | 'voter' | 'public' {
  if (spec.path.startsWith('/admin')) return 'committee';
  if (spec.auth === 'voter' || spec.path.startsWith('/auth')) return 'voter';
  return 'public';
}

function operation(name: string, spec: EndpointSpec): JsonObject {
  const parameters: Json[] = [];
  for (const [param, schema] of Object.entries(spec.params ?? {})) {
    parameters.push({ name: param, in: 'path', required: true, schema: schemaOf(schema) });
  }
  for (const [param, schema] of Object.entries(spec.query ?? {})) {
    parameters.push({ name: param, in: 'query', required: false, schema: schemaOf(schema) });
  }

  let success: JsonObject;
  if (spec.stream) {
    success = {
      description: `Server-sent events. Each \`event: ${spec.stream.event}\` carries JSON matching x-event-data`,
      content: { 'text/event-stream': { schema: { type: 'string' } } },
      'x-event-name': spec.stream.event,
      'x-event-data': schemaOf(spec.stream.data),
    };
  } else if (spec.file) {
    success = {
      description: 'File download (name in Content-Disposition)',
      content: { [spec.file.contentType]: { schema: { type: 'string', format: 'binary' } } },
    };
  } else if (spec.response) {
    success = { description: 'OK', content: json(schemaOf(spec.response)) };
  } else {
    success = { description: 'No content' };
  }
  if (spec.startsSession) {
    success['x-frontend'] =
      'The Next server keeps `token` in an httpOnly cookie and removes token/expires_at from the body';
  }

  const op: JsonObject = {
    operationId: name,
    summary: ENDPOINT_SUMMARIES[name as EndpointName],
    tags: [tagOf(spec)],
    responses: { [String(spec.status)]: success, ...errorResponses(spec) },
  };
  if (parameters.length > 0) op.parameters = parameters;
  if (spec.body) {
    op.requestBody = { required: !spec.bodyOptional, content: json(schemaOf(spec.body)) };
  }
  if (spec.multipart) {
    op.requestBody = {
      required: true,
      content: {
        'multipart/form-data': {
          schema: {
            type: 'object',
            properties: { [spec.multipart]: { type: 'string', format: 'binary' } },
            required: [spec.multipart],
          },
        },
      },
    };
  }
  op.security = spec.auth === 'public' ? [] : [{ [`${spec.auth}Token`]: [] }];
  return op;
}

function build(): JsonObject {
  const paths: Record<string, JsonObject> = {};
  for (const [name, spec] of Object.entries(ENDPOINTS) as [string, EndpointSpec][]) {
    if (spec.bffOnly) continue;
    const item = (paths[spec.path] ??= {});
    item[spec.method.toLowerCase()] = operation(name, spec);
  }
  return {
    openapi: '3.1.0',
    info: {
      title: 'Pilketum BCC 2026 API (as used by the frontend)',
      version: pkg.version,
      description:
        'Generated from src/lib/api/contract.ts by `pnpm contract:openapi`. Do not edit by hand. ' +
        'Source: the backend doc "API Pilketum BCC"; open points in docs/BACKEND_QUESTIONS.md.',
    },
    servers: [
      { url: '{origin}/api', variables: { origin: { default: 'https://api.example.org' } } },
    ],
    tags: [
      { name: 'public', description: 'No token' },
      { name: 'voter', description: 'Voter Bearer token' },
      { name: 'committee', description: 'Committee Bearer token' },
    ],
    paths,
    components: {
      securitySchemes: {
        voterToken: { type: 'http', scheme: 'bearer', description: 'Voter token (2 h)' },
        adminToken: { type: 'http', scheme: 'bearer', description: 'Committee token (12 h)' },
      },
      schemas: {
        Error: {
          ...schemaOf(errorBodySchema),
          'x-known-codes': Object.keys(ERROR_STATUS),
        },
      },
    },
  };
}

const output = `${JSON.stringify(build(), null, 2)}\n`;

if (process.argv.includes('--check')) {
  let current = '';
  try {
    current = readFileSync(OUT, 'utf8');
  } catch {
    // missing file counts as stale
  }
  if (current.replace(/\r\n/g, '\n') !== output) {
    console.error('docs/openapi.json is stale. Run `pnpm contract:openapi` and commit the result.');
    process.exit(1);
  }
  console.log('docs/openapi.json is up to date.');
} else {
  writeFileSync(OUT, output);
  console.log(`Wrote ${OUT}`);
}

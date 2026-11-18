import * as z from 'zod/mini';

/**
 * Zod 4 probes `new Function` to decide whether it may JIT-compile parsers. Our CSP forbids eval,
 * so the probe shows up as a CSP violation (and a Lighthouse Best Practices failure).
 * jitless parsing is slower by microseconds and avoids the probe entirely.
 */
z.config({ jitless: true });

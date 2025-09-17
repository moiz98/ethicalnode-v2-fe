// Browser polyfills for Node.js modules
import { Buffer } from 'buffer';

// Make Buffer available globally
(globalThis as any).Buffer = Buffer;
(window as any).Buffer = Buffer;

// Process polyfill
(globalThis as any).process = {
  env: {},
  version: '',
  platform: 'browser',
  nextTick: (fn: Function) => setTimeout(fn, 0),
  browser: true,
  cwd: () => '/',
  chdir: () => {},
  stderr: {},
  stdout: {},
  stdin: {},
};

(globalThis as any).global = globalThis;

export { Buffer };
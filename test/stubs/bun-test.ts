// Minimal stub for `bun:test` so vitest can run tests written against
// bun's test API (used by the `nuxt` project — see vitest.config.ts).

export const test = (_name: string, _fn: (...args: unknown[]) => unknown | Promise<unknown>) => {};

export const describe = (
  _name: string,
  _fn: (...args: unknown[]) => unknown | Promise<unknown>,
) => {};

export const expect = (..._args: unknown[]) => {
  const chain: { toBe: (...a: unknown[]) => unknown; toEqual: (...a: unknown[]) => unknown } = {
    toBe: () => chain,
    toEqual: () => chain,
  };
  return chain;
};

export const beforeAll = (_fn: (...args: unknown[]) => unknown | Promise<unknown>) => {};
export const afterAll = (_fn: (...args: unknown[]) => unknown | Promise<unknown>) => {};
export const beforeEach = (_fn: (...args: unknown[]) => unknown | Promise<unknown>) => {};
export const afterEach = (_fn: (...args: unknown[]) => unknown | Promise<unknown>) => {};
export const it = test;

const mock = {
  fn: () => () => undefined,
};
export { mock };

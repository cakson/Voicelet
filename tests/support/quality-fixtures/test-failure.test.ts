import { describe, expect, it } from 'vitest';

describe('quality failure fixture', () => {
  it('fails intentionally', () => {
    expect(true).toBe(false);
  });
});

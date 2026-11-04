import { describe, expect, it } from 'vitest';
import { onRequest } from '../../../functions/api/[[path]]';

describe('Pages Function of the relay', () => {
  it('gives the request and the environment to the relay', async () => {
    const request = new Request('https://fertility-tracker.gsuquet.com/api/vaults/x');
    const response = await onRequest({ request, env: {} });
    expect(response.status).toBe(503);
  });
});

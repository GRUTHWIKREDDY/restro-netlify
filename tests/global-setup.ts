import { request } from '@playwright/test';

export default async function globalSetup() {
  const apiRequest = await request.newContext({ baseURL: 'http://localhost:3001' });
  await apiRequest.post('/api/reset');
  await apiRequest.dispose();
}

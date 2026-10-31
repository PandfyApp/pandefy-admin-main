import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests',
  use: { baseURL: 'http://127.0.0.1:4173', screenshot: 'only-on-failure' },
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 4173', env: { VITE_API_BASE_URL: 'http://localhost:8080' }, url: 'http://127.0.0.1:4173', reuseExistingServer: false },
})

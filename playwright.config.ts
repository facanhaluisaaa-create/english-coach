import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3100);

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: true,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "off",
    // Allows running against a system Chromium (e.g. PW_EXECUTABLE_PATH=/usr/bin/chromium) without `playwright install`.
    launchOptions: process.env.PW_EXECUTABLE_PATH ? { executablePath: process.env.PW_EXECUTABLE_PATH } : undefined,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npm run build >/dev/null 2>&1 && PORT=${PORT} npm run start`,
    url: `http://localhost:${PORT}/setup`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: {
      // Unreachable Supabase project: every session check fails closed → redirects work without a backend.
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://e2e-placeholder.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "e2e-anon-key",
      PORT: String(PORT),
    },
  },
});

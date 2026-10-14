import { defineConfig, devices } from '@playwright/test';

/**
 * 数据流转安全管理平台 - Playwright E2E 测试配置
 *
 * 被测系统: https://172.16.5.94/user/login
 * 技术栈: Vue + Ant Design Pro (SPA)
 * 认证方式: RSA 动态公钥加密 username/password → JWT Token
 */
export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './test-results/artifacts',
  fullyParallel: false,          // 登录态互斥（单点登录），串行执行
  workers: 1,                    // 强制单 worker，避免并发登录触发"被迫下线"
  timeout: 60_000,               // 单用例超时 60s
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'test-results/report', open: 'never' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
  ],

  use: {
    baseURL: 'https://172.16.5.94',
    // 内网自签名证书
    ignoreHTTPSErrors: true,
    viewport: { width: 1920, height: 1080 },
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

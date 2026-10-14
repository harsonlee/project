import { test as base, expect, Page } from '@playwright/test';

/**
 * 自定义 fixture：自动登录 + 单点登录保护
 *
 * 被测系统为"主账号单点登录"——同一账号新登录会使旧会话下线（401）。
 * 因此所有用例串行执行（workers=1），每个用例通过 storageState 复用登录态，
 * 避免反复触发登录导致会话互踢。
 *
 * 登录页真实 DOM（实测）：
 *   - 用户名: input#username  (placeholder "请输入用户名...")
 *   - 密码:   input#password  (type=password)
 *   - 按钮:   button.login-button (文本 "确 定")
 *   - 错误提示: .ant-notification-notice（右上角通知，非 .ant-message）
 */

export const CREDENTIALS = {
  username: 'admin',
  password: '123456',
};

const STORAGE_STATE_FILE = 'test-results/.auth/admin.json';

/** 在浏览器中完成 UI 登录（前端 JS 自动处理 RSA 加密） */
export async function loginViaUI(page: Page): Promise<void> {
  await page.goto('/user/login');
  await page.waitForSelector('#username', { timeout: 30_000 });
  await page.fill('#username', CREDENTIALS.username);
  await page.fill('#password', CREDENTIALS.password);
  await page.click('button.login-button');
  // 等待离开登录页（SPA 路由跳转，默认落地 /views/interfaceLedgerManage）
  await page.waitForURL((url) => !url.pathname.includes('/user/login'), { timeout: 30_000 });
}

/** 断言页面出现登录失败通知（右上角 ant-notification） */
export async function expectLoginError(page: Page): Promise<void> {
  const notice = page.locator('.ant-notification-notice').first();
  await expect(notice).toBeVisible({ timeout: 10_000 });
  await expect(notice).toContainText(/登录失败|用户名或密码错误/);
}

type Fixtures = {
  authenticatedPage: Page;
};

export const test = base.extend<Fixtures>({
  /**
   * 已登录的页面。优先复用 storageState；失效时重新走 UI 登录并刷新 state。
   */
  authenticatedPage: async ({ browser }, use) => {
    let context;
    try {
      context = await browser.newContext({
        storageState: STORAGE_STATE_FILE,
        ignoreHTTPSErrors: true,
        viewport: { width: 1920, height: 1080 },
        locale: 'zh-CN',
        timezoneId: 'Asia/Shanghai',
      });
    } catch {
      context = await browser.newContext({
        ignoreHTTPSErrors: true,
        viewport: { width: 1920, height: 1080 },
        locale: 'zh-CN',
        timezoneId: 'Asia/Shanghai',
      });
    }

    const page = await context.newPage();

    // 验证当前 storageState 是否仍有效：访问受保护接口
    let valid = false;
    try {
      const resp = await page.request.get('/scmp-manage/manager/menu');
      valid = resp.status() === 200;
    } catch {
      valid = false;
    }

    if (!valid) {
      await loginViaUI(page);
      await context.storageState({ path: STORAGE_STATE_FILE });
    }

    await use(page);
    await context.close();
  },
});

export { expect };

import { test, expect, CREDENTIALS, loginViaUI, expectLoginError } from './fixtures';

/**
 * 模块：系统登录（/user/login）
 * 覆盖：正常登录、错误密码、空输入、登录后跳转、页面标题
 */

test.describe('系统登录', () => {

  test('TC-LOGIN-001 正确账号密码登录成功并进入系统首页', async ({ page }) => {
    await loginViaUI(page);
    // 默认落地页为接口台账管理，顶部菜单应完整渲染
    await expect(page.locator('.scmp_topmenu').first()).toBeVisible({ timeout: 15_000 });
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toContain('数据流转安全管理平台');
  });

  test('TC-LOGIN-002 错误密码提示登录失败且停留在登录页', async ({ page }) => {
    await page.goto('/user/login');
    await page.waitForSelector('#username', { timeout: 30_000 });
    await page.fill('#username', CREDENTIALS.username);
    await page.fill('#password', 'wrong-password-999');
    await page.click('button.login-button');

    await expectLoginError(page);
    await expect(page).toHaveURL(/\/user\/login/);
  });

  test('TC-LOGIN-003 用户名为空时提交被拦截或提示失败', async ({ page }) => {
    await page.goto('/user/login');
    await page.waitForSelector('#username', { timeout: 30_000 });
    // 用户名留空，仅填密码
    await page.fill('#password', CREDENTIALS.password);
    await page.click('button.login-button');

    await page.waitForTimeout(4_000);
    const stillOnLogin = page.url().includes('/user/login');
    const hasFeedback =
      (await page.locator('.ant-form-item-explain-error').count()) > 0 ||
      (await page.locator('.ant-notification-notice').count()) > 0;
    expect(stillOnLogin || hasFeedback).toBeTruthy();
  });

  test('TC-LOGIN-004 密码为空时提交被拦截或提示失败', async ({ page }) => {
    await page.goto('/user/login');
    await page.waitForSelector('#username', { timeout: 30_000 });
    await page.fill('#username', CREDENTIALS.username);
    // 密码留空
    await page.click('button.login-button');

    await page.waitForTimeout(4_000);
    const stillOnLogin = page.url().includes('/user/login');
    const hasFeedback =
      (await page.locator('.ant-form-item-explain-error').count()) > 0 ||
      (await page.locator('.ant-notification-notice').count()) > 0;
    expect(stillOnLogin || hasFeedback).toBeTruthy();
  });

  test('TC-LOGIN-005 不存在的用户名提示登录失败', async ({ page }) => {
    await page.goto('/user/login');
    await page.waitForSelector('#username', { timeout: 30_000 });
    await page.fill('#username', 'no_such_user_xyz');
    await page.fill('#password', 'whatever123');
    await page.click('button.login-button');

    await expectLoginError(page);
    await expect(page).toHaveURL(/\/user\/login/);
  });

  test('TC-LOGIN-006 登录成功后页面标题与平台名称一致', async ({ page }) => {
    await loginViaUI(page);
    const title = await page.title();
    expect(title).toContain('数据流转安全管理平台');
  });

  test('TC-LOGIN-007 登录表单空值校验：用户名密码均空时提交不进入系统', async ({ page }) => {
    await page.goto('/user/login');
    await page.waitForSelector('#username', { timeout: 30_000 });
    // 两个字段均留空，直接点"确 定"
    await page.click('button.login-button');
    await page.waitForTimeout(3_000);
    // 应停留在登录页（无内联错误时也至少不应跳转）
    expect(page.url()).toContain('/user/login');
  });

  test('TC-LOGIN-008 登录长度/边界校验：超长用户名按失败处理且不崩溃', async ({ page }) => {
    await page.goto('/user/login');
    await page.waitForSelector('#username', { timeout: 30_000 });
    await page.fill('#username', 'a'.repeat(150));
    await page.fill('#password', 'Test@12345');
    await page.click('button.login-button');
    await page.waitForTimeout(3_000);
    // 超长用户名应按"登录失败"处理并停留登录页
    expect(page.url()).toContain('/user/login');
    const notice = page.locator('.ant-notification-notice').first();
    if ((await notice.count()) > 0) {
      await expect(notice).toContainText(/登录失败|用户名或密码错误/);
    }
  });

  test('TC-LOGIN-009 登录注入/特殊字符输入被安全拒绝', async ({ page }) => {
    await page.goto('/user/login');
    await page.waitForSelector('#username', { timeout: 30_000 });
    await page.fill('#username', "admin'; DROP TABLE users;--");
    await page.fill('#password', 'Test@12345');
    await page.click('button.login-button');
    await page.waitForTimeout(3_000);
    // 注入式用户名不可能登录成功，应停留登录页并给出失败提示
    expect(page.url()).toContain('/user/login');
    const notice = page.locator('.ant-notification-notice').first();
    if ((await notice.count()) > 0) {
      await expect(notice).toContainText(/登录失败|用户名或密码错误/);
    }
  });
});

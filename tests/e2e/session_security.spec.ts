import { test, expect } from './fixtures';

/**
 * 模块：会话与安全机制
 * 覆盖：单点登录互踢、Token 失效处理、登出行为、暴力尝试防护
 *
 * 注意：本模块用例会主动破坏 admin 登录态（触发互踢/登出），
 * Playwright 按文件名字母序执行，session_security 最后运行；
 * 执行后 storageState 失效，下次运行 E2E 会自动重新登录。
 */

async function loginIn(page: any): Promise<void> {
  await page.goto('/user/login');
  await page.waitForSelector('#username', { timeout: 30_000 });
  await page.fill('#username', 'admin');
  await page.fill('#password', '123456');
  await page.click('button.login-button');
  await page.waitForURL((url: URL) => !url.pathname.includes('/user/login'), { timeout: 30_000 });
}

test.describe('会话与安全', () => {

  test('TC-SEC-001 同一账号二次登录后原会话被强制下线（单点登录）', async ({ browser }) => {
    // 会话 A：正常登录
    const ctxA = await browser.newContext({ ignoreHTTPSErrors: true });
    const pageA = await ctxA.newPage();
    await loginIn(pageA);

    // 会话 B：同账号再次登录
    const ctxB = await browser.newContext({ ignoreHTTPSErrors: true });
    const pageB = await ctxB.newPage();
    await loginIn(pageB);

    // 会话 A 再请求受保护接口应返回 401（被迫下线）
    const respA = await pageA.request.get('/scmp-manage/manager/menu');
    expect(respA.status()).toBe(401);
    const body = await respA.json();
    // 401 响应体 message 可能为"未授权"或"您已被迫下线"，二者均表示会话已失效
    expect((body.message || '') + (body.exception || '')).toMatch(/下线|登录|未授权|unauthorized/i);

    await ctxA.close();
    await ctxB.close();
  });

  test('TC-SEC-002 无效 Token 访问受保护接口返回 401', async ({ browser }) => {
    const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await ctx.newPage();
    await page.goto('/user/login');

    const resp = await page.request.get('/scmp-manage/manager/menu', {
      headers: { Authorization: 'JWT INVALID_TOKEN_12345' },
    });
    expect(resp.status()).toBe(401);
    await ctx.close();
  });

  test('TC-SEC-003 登出后会话失效，需重新登录', async ({ browser }) => {
    const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await ctx.newPage();
    await loginIn(page);

    // 从页面 localStorage 提取 token（实测存储于 Access-Token，格式 "JWT <hex>"）
    const token = await page.evaluate(() => {
      const raw = window.localStorage.getItem('Access-Token') || '';
      return raw.replace(/^JWT\s+/i, '').replace(/^"|"$/g, '');
    });
    expect(token).toBeTruthy();

    // 调用登出接口（后端恒返回 500 但实际已使 token 失效——已知缺陷）
    await page.request.post('/scmp-manage/manager/logout', {
      headers: { Authorization: `JWT ${token}` },
    });

    // 旧 token 访问菜单应 401
    const resp = await page.request.get('/scmp-manage/manager/menu', {
      headers: { Authorization: `JWT ${token}` },
    });
    expect(resp.status()).toBe(401);

    await ctx.close();
  });

  test('TC-SEC-004 连续多次错误密码登录不产生异常（无锁定或按策略提示）', async ({ browser }) => {
    const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await ctx.newPage();
    for (let i = 0; i < 3; i++) {
      await page.goto('/user/login');
      await page.waitForSelector('#username', { timeout: 30_000 });
      await page.fill('#username', 'admin');
      await page.fill('#password', `bad_${i}_pass`);
      await page.click('button.login-button');
      await page.waitForTimeout(2_500);
      // 每次都应停留在登录页
      expect(page.url()).toContain('/user/login');
    }
    await ctx.close();
  });

  test('TC-SEC-005 UI 退出登录：头像菜单→退出登录→确认框确定→跳转登录页', async ({ browser }) => {
    const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await ctx.newPage();
    await loginIn(page);

    // 点击右上角头像，展开下拉菜单（个人中心 / 退出登录）
    await page.locator('.ant-pro-account-avatar').first().click();
    await page.waitForTimeout(1_500);

    // 点击"退出登录"菜单项
    await page.evaluate(() => {
      const items = [...document.querySelectorAll('.ant-dropdown:not(.ant-dropdown-hidden) .ant-dropdown-menu-item, .ant-dropdown:not(.ant-dropdown-hidden) li')];
      const t = items.find((i) => (i.textContent || '').includes('退出登录'));
      if (t) (t as HTMLElement).click();
    });
    await page.waitForTimeout(1_500);

    // 确认弹窗"您确定要注销吗？"→ 点"确 定"
    await page.evaluate(() => {
      const m = document.querySelector('.ant-modal:not([style*="display: none"])');
      if (!m) return;
      const btns = [...m.querySelectorAll('button')];
      const ok = btns.find((b) => (b.textContent || '').replace(/\s/g, '').includes('确定'));
      if (ok) (ok as HTMLElement).click();
    });

    // 应跳转到登录页
    await page.waitForURL(/\/user\/login/, { timeout: 20_000 });
    expect(page.url()).toContain('/user/login');

    await ctx.close();
    // 说明：本用例会登出 admin 会话，storageState 失效；下次运行 E2E 时 fixture 会自动重新登录。
  });
});

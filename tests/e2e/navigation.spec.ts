import { test, expect } from './fixtures';

/**
 * 模块：主界面导航与菜单完整性
 *
 * 实测布局（非标准 Ant Design Pro Sider）：
 *   - 顶部横排一级菜单: .scmp_menu_onelevel li（6 个一级模块）
 *   - 点击一级项后右侧展开二级面板: .scmp_menu_sublevel
 *     其中每个功能入口为 <a href="/xxx" id="menuName">
 *   - 右上角用户区: .scmp_right_menu（显示 admin）
 */

const TOP_MENU_ITEMS = ['流程管理', '数据接口开通', '接口安全监测', '接口台账管理', '集省数据联动', '系统管理中心'];

test.describe('主界面导航', () => {

  test('TC-NAV-001 登录后首页正常加载且顶部菜单可见', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.scmp_topmenu').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.scmp_menu_onelevel').first()).toBeVisible();
  });

  test('TC-NAV-002 一级菜单项完整展示（6 个模块）', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.scmp_menu_onelevel', { timeout: 15_000 });

    for (const name of TOP_MENU_ITEMS) {
      const item = page.locator('.scmp_menu_onelevel li').filter({ hasText: name }).first();
      await expect(item).toBeVisible({ timeout: 10_000 });
    }
  });

  test('TC-NAV-003 点击"系统管理中心"展开子菜单包含账号管理等入口', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.scmp_menu_onelevel', { timeout: 15_000 });

    await page.locator('.scmp_menu_onelevel li').filter({ hasText: '系统管理中心' }).first().click();
    await page.waitForSelector('.scmp_menu_sublevel', { timeout: 10_000 });

    // 二级面板中的功能入口链接
    for (const name of ['账号管理', '角色管理', '组织机构管理']) {
      const link = page.locator('.scmp_menu_sublevel a').filter({ hasText: name }).first();
      await expect(link).toBeVisible({ timeout: 10_000 });
    }
  });

  test('TC-NAV-004 点击"账号管理"进入用户管理页面', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.scmp_menu_onelevel', { timeout: 15_000 });

    await page.locator('.scmp_menu_onelevel li').filter({ hasText: '系统管理中心' }).first().click();
    await page.waitForSelector('.scmp_menu_sublevel', { timeout: 10_000 });

    await page.locator('.scmp_menu_sublevel a').filter({ hasText: '账号管理' }).first().click();
    await page.waitForURL(/userManage/, { timeout: 20_000 });
    await expect(page.locator('.ant-table, .ant-form').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-NAV-005 未登录直接访问受保护页面被重定向到登录页', async ({ browser }) => {
    const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await ctx.newPage();
    await page.goto('/manage/userManage');
    await page.waitForTimeout(6_000);
    expect(page.url()).toContain('/user/login');
    await ctx.close();
  });

  test('TC-NAV-006 右上角显示当前登录用户名', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2_000);
    const rightMenu = page.locator('.scmp_right_menu').first();
    await expect(rightMenu).toBeVisible();
    const text = await rightMenu.textContent();
    expect(text).toMatch(/admin|超级管理员/i);
  });
});

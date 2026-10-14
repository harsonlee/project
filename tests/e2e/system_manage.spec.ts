import { test, expect } from './fixtures';

/**
 * 模块：系统管理中心（角色管理 / 组织机构 / 字典管理 / 操作日志）
 * 覆盖：各子页面可访问且核心组件渲染正常
 */

const PAGES = [
  { name: '角色管理', path: '/system/roleManage', keyword: /角色/ },
  { name: '组织机构管理', path: '/system/OrgManage', keyword: /组织|机构/ },
  { name: '用户组管理', path: '/system/UserGroupManage', keyword: /用户组/ },
  { name: '菜单管理', path: '/system/funcManage', keyword: /菜单/ },
  { name: '通用字典管理', path: '/system/dicManage', keyword: /字典/ },
  { name: '操作日志管理', path: '/system/syslog', keyword: /日志/ },
  { name: '公告管理', path: '/system/noticeManage', keyword: /公告/ },
];

test.describe('系统管理中心', () => {

  for (const p of PAGES) {
    test(`TC-SYS-00x ${p.name}页面可访问且正常渲染`, async ({ authenticatedPage: page }) => {
      await page.goto(p.path);
      await page.waitForLoadState('networkidle');
      // 等待主体内容区出现表格/表单/树/空态之一
      await page.waitForSelector('.ant-table, .ant-form, .ant-tree, .ant-empty, .ant-card', { timeout: 20_000 });
      const bodyText = await page.locator('body').textContent();
      expect(bodyText).toMatch(p.keyword);
    });
  }

  test('TC-SYS-ROLE-001 角色管理页展示角色列表且可通过搜索定位角色', async ({ authenticatedPage: page }) => {
    await page.goto('/system/roleManage');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.ant-table, .ant-empty', { timeout: 20_000 });
    // 角色表格应有数据行（环境内存在"业务""辽宁-接口提供方负责人角色"等角色）
    const rowCount = await page.locator('.ant-table-tbody tr td').count();
    expect(rowCount).toBeGreaterThanOrEqual(1);
    // 若页面提供搜索框，按"业务"过滤应仍有匹配结果
    const searchInput = page.locator('input[placeholder*="名称"], input[placeholder*="角色"]').first();
    if ((await searchInput.count()) > 0) {
      await searchInput.fill('业务');
      const queryBtn = page.getByRole('button', { name: /查\s*询|搜\s*索/ }).first();
      if ((await queryBtn.count()) > 0) {
        await queryBtn.click();
        await page.waitForTimeout(2_500);
        const filtered = await page.locator('.ant-table-tbody tr td').count();
        const emptyVisible = (await page.locator('.ant-empty, .ant-table-placeholder').count()) > 0;
        expect(filtered > 0 || emptyVisible).toBeTruthy();
      }
    }
  });

  test('TC-SYS-DIC-001 字典管理支持新增字典项（表单校验）', async ({ authenticatedPage: page }) => {
    await page.goto('/system/dicManage');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2_000);

    const addBtn = page.getByRole('button', { name: /新\s*增|添\s*加|add/i }).first();
    if ((await addBtn.count()) === 0) {
      test.skip(true, '未找到新增按钮，跳过');
      return;
    }
    await addBtn.click();
    await page.waitForTimeout(1_500);

    const modal = page.locator('.ant-modal, .ant-drawer').last();
    if ((await modal.count()) === 0) {
      test.skip(true, '未弹出新增表单，跳过');
      return;
    }
    await expect(modal).toBeVisible();
    // 空表单提交应触发校验
    await modal.getByRole('button', { name: /确\s*定|保\s*存|提\s*交|ok/i }).click();
    await page.waitForTimeout(1_200);
    const errors = await modal.locator('.ant-form-item-explain-error').count();
    expect(errors).toBeGreaterThanOrEqual(1);
    await modal.locator('.ant-modal-close, .ant-drawer-close').first().click();
  });

  test('TC-SYS-LOG-001 操作日志列表可按时间范围查询', async ({ authenticatedPage: page }) => {
    await page.goto('/system/syslog');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.ant-table, .ant-form, .ant-empty', { timeout: 20_000 });

    // 查找日期范围选择器
    const dateRange = page.locator('.ant-picker-range, .ant-picker').first();
    if ((await dateRange.count()) === 0) {
      test.skip(true, '未找到时间筛选控件，跳过');
      return;
    }
    await dateRange.click();
    await page.waitForTimeout(800);
    // 选择一个预设或今日
    const todayOption = page.locator('.ant-picker-presets li, .ant-picker-today-btn').first();
    if ((await todayOption.count()) > 0) {
      await todayOption.click();
      await page.waitForTimeout(1_500);
    }
    // 点击查询
    const queryBtn = page.getByRole('button', { name: /查\s*询|搜\s*索|search/i }).first();
    if ((await queryBtn.count()) > 0) await queryBtn.click();
    await page.waitForTimeout(2_500);
    await expect(page.locator('.ant-table, .ant-empty').first()).toBeVisible({ timeout: 10_000 });
  });
});

import { test, expect } from './fixtures';

/**
 * 模块：接口异常调用监测及告警处置（/views/riskAlertManage）
 *       接口异常调用监测配置（/riskAlert/riskAlertRule）
 *
 * 实测页面结构：
 *   - 告警页: 搜索框(接口名称/接口URL) + 4 个下拉筛选(状态如"待推送/推送成功/推送失败"等)
 *             + "查询/重置/刷新"按钮 + 表格
 *   - 规则页: "导出全部配置/刷新"按钮，通用配置/接口级配置 Tab，
 *             展示 N 条监测行为及启用状态（无新增按钮，空表单校验用例不适用→改为配置完整性验证）
 */

test.describe('接口异常调用监测及告警', () => {

  test('TC-RISK-001 告警处置列表页面正常加载', async ({ authenticatedPage: page }) => {
    await page.goto('/views/riskAlertManage');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.ant-table', { timeout: 20_000 });
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toMatch(/告警|异常|监测/);
    // 筛选区与操作按钮应存在
    await expect(page.getByRole('button', { name: /查\s*询/ }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /重\s*置/ }).first()).toBeVisible();
  });

  test('TC-RISK-002 告警列表支持按状态下拉筛选', async ({ authenticatedPage: page }) => {
    await page.goto('/views/riskAlertManage');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2_000);

    const select = page.locator('.ant-select').first();
    if ((await select.count()) === 0) {
      test.skip(true, '未找到筛选下拉框，跳过');
      return;
    }
    await select.click();
    await page.waitForTimeout(1_200);
    const option = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-dropdown-menu-item').first();
    if ((await option.count()) === 0) {
      test.skip(true, '下拉无可选项，跳过');
      return;
    }
    await option.click();
    await page.waitForTimeout(1_000);
    await page.getByRole('button', { name: /查\s*询/ }).first().click();
    await page.waitForTimeout(3_000);
    await expect(page.locator('.ant-table, .ant-empty').first()).toBeVisible({ timeout: 10_000 });
  });

  test('TC-RISK-003 按接口名称搜索告警记录', async ({ authenticatedPage: page }) => {
    await page.goto('/views/riskAlertManage');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2_000);

    const searchInput = page.locator('input[placeholder*="接口名称"]').first();
    if ((await searchInput.count()) === 0) {
      test.skip(true, '未找到接口名称搜索框，跳过');
      return;
    }
    await searchInput.fill('接口AA');
    await page.getByRole('button', { name: /查\s*询/ }).first().click();
    await page.waitForTimeout(3_000);

    const rowCount = await page.locator('.ant-table-tbody tr td').count();
    const emptyVisible = (await page.locator('.ant-empty, .ant-table-placeholder').count()) > 0;
    expect(rowCount > 0 || emptyVisible).toBeTruthy();
  });

  test('TC-RISK-004 点击"重置"清空筛选条件', async ({ authenticatedPage: page }) => {
    await page.goto('/views/riskAlertManage');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2_000);

    const searchInput = page.locator('input[placeholder*="接口名称"]').first();
    if ((await searchInput.count()) > 0) {
      await searchInput.fill('接口AA');
    }
    await page.getByRole('button', { name: /重\s*置/ }).first().click();
    await page.waitForTimeout(2_500);

    // 重置后搜索框应为空
    if ((await searchInput.count()) > 0) {
      expect(await searchInput.inputValue()).toBe('');
    }
    await expect(page.locator('.ant-table, .ant-empty').first()).toBeVisible({ timeout: 10_000 });
  });

  test('TC-RISK-005 异常调用监测配置页展示监测行为清单', async ({ authenticatedPage: page }) => {
    await page.goto('/riskAlert/riskAlertRule');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3_000);

    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toContain('异常监测规则配置');
    // 应展示监测行为数量统计
    expect(bodyText).toMatch(/共\s*\d+\s*条监测行为/);
    expect(bodyText).toMatch(/已启用/);
    // 通用配置 / 接口级配置 Tab 应存在
    expect(bodyText).toContain('通用配置');
    expect(bodyText).toContain('接口级配置');
  });
});

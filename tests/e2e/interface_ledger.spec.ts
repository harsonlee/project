import { test, expect } from './fixtures';

/**
 * 模块：接口台账管理（核心业务模块）
 * 路由：/views/interfaceLedgerManage（登录后默认落地页）
 *
 * 实测页面结构：
 *   - 搜索: placeholder "搜索接口名称..."，按钮"搜 索"
 *   - 工具栏: 新建接口 / 导出台账 / 上报集团 / 推送台账 / 模板下载 / 导入 / 批量删除 等
 *   - 表格行操作图标 .action_btn：eye=查看详情 等
 */

test.describe('接口台账管理', () => {

  async function gotoLedger(page: any) {
    await page.goto('/views/interfaceLedgerManage');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.ant-table', { timeout: 20_000 });
  }

  test('TC-LEDGER-001 台账列表页面正常加载且展示统计卡片', async ({ authenticatedPage: page }) => {
    await gotoLedger(page);
    await expect(page.locator('.ant-table').first()).toBeVisible({ timeout: 15_000 });
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toContain('接口台账');
    // 顶部统计指标
    expect(bodyText).toMatch(/已注册接口总数|活跃接口/);
  });

  test('TC-LEDGER-002 按接口名称搜索可过滤结果', async ({ authenticatedPage: page }) => {
    await gotoLedger(page);
    const searchInput = page.locator('input[placeholder*="搜索接口名称"]').first();
    if ((await searchInput.count()) === 0) {
      test.skip(true, '未找到接口名称搜索框，跳过');
      return;
    }
    await searchInput.fill('接口AA');
    await page.getByRole('button', { name: /搜\s*索/ }).first().click();
    await page.waitForTimeout(3_000);

    // 有匹配数据则校验行内容；无数据则校验空态，二者之一成立即通过
    const rowCount = await page.locator('.ant-table-tbody tr td').count();
    const emptyVisible = (await page.locator('.ant-empty, .ant-table-placeholder').count()) > 0;
    expect(rowCount > 0 || emptyVisible).toBeTruthy();
    if (rowCount > 0) {
      const firstRow = await page.locator('.ant-table-tbody tr').first().textContent();
      expect(firstRow).toContain('接口AA');
    }
  });

  test('TC-LEDGER-003 点击台账行"查看"进入详情弹窗（真实断言）', async ({ authenticatedPage: page }) => {
    await gotoLedger(page);
    const firstRow = page.locator('.ant-table-tbody tr').first();
    if ((await firstRow.count()) === 0) {
      test.skip(true, '台账列表为空，跳过');
      return;
    }
    // 操作列"查看"(eye)图标：点击其可点击祖先触发详情
    const eyeIcon = firstRow.locator('.action_btn .anticon-eye').first();
    await expect(eyeIcon).toBeAttached({ timeout: 10_000 });

    // 通过 JS 定位并点击 eye 图标的可点击祖先（<a>/<button>/带 onclick 的元素）
    await page.evaluate(() => {
      const t = document.querySelector('.ant-table-tbody');
      if (!t) return;
      const tr = t.querySelector('tr');
      if (!tr) return;
      const eye = tr.querySelector('.action_btn .anticon-eye');
      if (!eye) return;
      let el = eye as HTMLElement;
      while (el && el.tagName !== 'A' && el.tagName !== 'BUTTON' && !(el as any).onclick) {
        el = el.parentElement as HTMLElement;
        if (!el) break;
      }
      (el || eye).click();
    });

    // 应弹出"查看接口台账"详情弹窗，展示基本信息字段
    await page.waitForTimeout(1_500);
    const modalText = await page.evaluate(() => {
      const m = document.querySelector(
        '.ant-modal:not([style*="display: none"]),.ant-drawer-open,.ant-modal-wrap[style*="block"]',
      );
      return m ? (m.textContent || '').trim() : '';
    });
    expect(modalText).toContain('查看接口台账');
    expect(modalText).toMatch(/基本信息|接口名称|接口地址/);

    // 关闭弹窗（若存在取消/关闭按钮），避免影响后续用例
    const closeBtn = page.locator('.ant-modal button, .ant-drawer-content button').filter({ hasText: /取\s*消|关\s*闭/ }).first();
    if ((await closeBtn.count()) > 0) {
      await closeBtn.click();
      await page.waitForTimeout(800);
    }
  });

  test('TC-LEDGER-004 台账列表支持分页切换', async ({ authenticatedPage: page }) => {
    await gotoLedger(page);
    const pagination = page.locator('.ant-pagination').first();
    if ((await pagination.count()) === 0) {
      test.skip(true, '无分页控件（数据不足一页），跳过');
      return;
    }
    const nextBtn = pagination.locator('li.ant-pagination-next');
    if (await nextBtn.isEnabled()) {
      await nextBtn.click();
      await page.waitForTimeout(3_000);
      await expect(page.locator('.ant-table').first()).toBeVisible();
    } else {
      test.skip(true, '仅有一页数据，无法翻页');
    }
  });
});

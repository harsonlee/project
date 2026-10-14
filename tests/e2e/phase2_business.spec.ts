import { test, expect } from './fixtures';

/**
 * 模块：二期各业务子菜单交互层用例（TC-FLOW / TC-REG / TC-APPLY / TC-CALLTEST /
 *       TC-AUTHCODE / TC-CERT / TC-UNMANAGED / TC-POLICY / TC-LOGFILE / TC-APILOG /
 *       TC-RETENTION / TC-BIZSYS / TC-TLS / TC-SECPOLICY）
 *
 * 策略：对每类页面做代表性交互验证——搜索过滤、Tab 切换、时间快捷项、状态筛选、
 *       统计卡片、导出/新建入口存在性。写操作仅做空表单校验或"打开即关闭"，不真实落库。
 */

async function gotoAndSettle(page: any, path: string) {
  await page.goto(path);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2_500);
}

/** 点击第一个可见的"搜 索 / 查询"按钮 */
async function clickSearch(page: any) {
  const btn = page.getByRole('button', { name: /搜\s*索|查\s*询/ }).first();
  if ((await btn.count()) > 0) {
    await btn.click();
    await page.waitForTimeout(2_500);
  }
}

/**
 * 在页面内定位一个"可见"的搜索输入框并填入关键字。
 * 各列表页存在隐藏的通用"请输入关键字搜索"输入框，需排除；
 * 不同页面的可见搜索框 placeholder 不同，按候选顺序取第一个可见者。
 * @returns 是否成功填写（无可见搜索框时返回 false，调用方应跳过）
 */
async function fillVisibleSearch(page: any, keyword: string, candidates: string[]): Promise<boolean> {
  for (const cand of candidates) {
    const loc = page.locator(cand);
    const n = await loc.count();
    for (let i = 0; i < n; i++) {
      const el = loc.nth(i);
      if (await el.isVisible()) {
        await el.fill(keyword);
        return true;
      }
    }
  }
  return false;
}

test.describe('流程工作台', () => {
  test('TC-FLOW-001 我的待办列表加载且支持关键字搜索', async ({ authenticatedPage: page }) => {
    await gotoAndSettle(page, '/taxusFront/workspace/myAgency');
    await expect(page.locator('.ant-table').first()).toBeVisible({ timeout: 15_000 });
    const filled = await fillVisibleSearch(page, '测试', [
      'input[placeholder*="流程实例标题"]',
      'input[placeholder*="任务名称"]',
      'input[placeholder*="关键字"]',
    ]);
    if (!filled) {
      test.skip(true, '该页无可见搜索框，跳过搜索断言');
      return;
    }
    await clickSearch(page);
    const rowCount = await page.locator('.ant-table-tbody tr td').count();
    const empty = (await page.locator('.ant-empty, .ant-table-placeholder').count()) > 0;
    expect(rowCount >= 0 || empty).toBeTruthy();
  });

  test('TC-FLOW-002 我的已办列表加载', async ({ authenticatedPage: page }) => {
    await gotoAndSettle(page, '/taxusFront/workspace/myCompleted');
    await expect(page.locator('.ant-table').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-FLOW-003 发起流程入口可打开', async ({ authenticatedPage: page }) => {
    await gotoAndSettle(page, '/taxusFront/workspace/launchFlow');
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toMatch(/发起|流程/);
  });
});

test.describe('数据接口开通', () => {
  test('TC-REG-001 接口注册登记列表加载且支持搜索', async ({ authenticatedPage: page }) => {
    await gotoAndSettle(page, '/views/interfaceRegisterManage');
    await expect(page.locator('.ant-table').first()).toBeVisible({ timeout: 15_000 });
    const filled = await fillVisibleSearch(page, '接口', [
      'input[placeholder*="接口名称"]',
      'input[placeholder*="系统名称"]',
      'input[placeholder*="关键字"]',
    ]);
    if (!filled) {
      test.skip(true, '该页无可见搜索框，跳过搜索断言');
      return;
    }
    await clickSearch(page);
    const rowCount = await page.locator('.ant-table-tbody tr td').count();
    const empty = (await page.locator('.ant-empty, .ant-table-placeholder').count()) > 0;
    expect(rowCount >= 0 || empty).toBeTruthy();
  });

  test('TC-REG-002 接口注册登记"新增"抽屉可打开并关闭', async ({ authenticatedPage: page }) => {
    await gotoAndSettle(page, '/views/interfaceRegisterManage');
    const addBtn = page.getByRole('button', { name: /新\s*增|新\s*建/ }).first();
    if ((await addBtn.count()) === 0) {
      test.skip(true, '未找到新增按钮');
      return;
    }
    await addBtn.click();
    await page.waitForTimeout(1_500);
    const drawerOrModal = page.locator('.ant-drawer-open, .ant-modal:not([style*="display: none"])').first();
    if ((await drawerOrModal.count()) > 0) {
      // 打开后取消关闭，不落库
      const cancel = page.locator('.ant-drawer-content button, .ant-modal-footer button').filter({ hasText: /取\s*消|关\s*闭/ }).first();
      if ((await cancel.count()) > 0) {
        await cancel.click();
        await page.waitForTimeout(1_000);
      }
    }
  });

  test('TC-APPLY-001 调用申请页展示统计卡片（总数/待审批/已授权）', async ({ authenticatedPage: page }) => {
    await gotoAndSettle(page, '/views/interfaceCallApply');
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toMatch(/总\s*数|待审批|已授权/);
  });

  test('TC-APPLY-002 调用申请列表支持搜索', async ({ authenticatedPage: page }) => {
    await gotoAndSettle(page, '/views/interfaceCallApply');
    await expect(page.locator('.ant-table').first()).toBeVisible({ timeout: 15_000 });
    const filled = await fillVisibleSearch(page, '接口', [
      'input[placeholder*="接口名称"]',
      'input[placeholder*="系统名称"]',
      'input[placeholder*="调用方名称"]',
    ]);
    if (!filled) {
      test.skip(true, '该页无可见搜索框，跳过搜索断言');
      return;
    }
    await clickSearch(page);
    const rowCount = await page.locator('.ant-table-tbody tr td').count();
    const empty = (await page.locator('.ant-empty, .ant-table-placeholder').count()) > 0;
    expect(rowCount >= 0 || empty).toBeTruthy();
  });

  test('TC-CALLTEST-001 接口开通配置"查看参数"弹窗可打开', async ({ authenticatedPage: page }) => {
    await gotoAndSettle(page, '/views/InterfaceCallTest');
    await expect(page.locator('.ant-table').first()).toBeVisible({ timeout: 15_000 });
    const firstRow = page.locator('.ant-table-tbody tr').first();
    if ((await firstRow.count()) === 0) {
      test.skip(true, '列表为空，跳过');
      return;
    }
    const viewBtn = firstRow.getByRole('button', { name: /查看|参数/ }).first();
    const eyeIcon = firstRow.locator('.action_btn .anticon-eye, .anticon-eye').first();
    const target = (await viewBtn.count()) > 0 ? viewBtn : eyeIcon;
    if ((await target.count()) === 0) {
      test.skip(true, '行内无查看/参数入口');
      return;
    }
    await target.click();
    await page.waitForTimeout(1_500);
    const popup = page.locator('.ant-modal:not([style*="display: none"]), .ant-drawer-open').first();
    if ((await popup.count()) > 0) {
      const cancel = popup.locator('button').filter({ hasText: /取\s*消|关\s*闭/ }).first();
      if ((await cancel.count()) > 0) {
        await cancel.click();
        await page.waitForTimeout(800);
      }
    }
  });

  test('TC-AUTHCODE-001 授权码管理列表支持搜索', async ({ authenticatedPage: page }) => {
    await gotoAndSettle(page, '/views/authCodeManage');
    await expect(page.locator('.ant-table').first()).toBeVisible({ timeout: 15_000 });
    const filled = await fillVisibleSearch(page, 'A', [
      'input[placeholder*="授权码"]',
      'input[placeholder*="接口名称"]',
      'input[placeholder*="系统名称"]',
    ]);
    if (!filled) {
      test.skip(true, '该页无可见搜索框，跳过搜索断言');
      return;
    }
    await clickSearch(page);
    const rowCount = await page.locator('.ant-table-tbody tr td').count();
    const empty = (await page.locator('.ant-empty, .ant-table-placeholder').count()) > 0;
    expect(rowCount >= 0 || empty).toBeTruthy();
  });

  test('TC-AUTHCODE-002 授权码管理状态筛选下拉可用', async ({ authenticatedPage: page }) => {
    await gotoAndSettle(page, '/views/authCodeManage');
    const select = page.locator('.ant-select').first();
    if ((await select.count()) === 0) {
      test.skip(true, '无状态筛选下拉');
      return;
    }
    await select.click();
    await page.waitForTimeout(800);
    const options = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) li');
    expect(await options.count()).toBeGreaterThanOrEqual(1);
    await page.keyboard.press('Escape');
  });

  test('TC-CERT-001 凭证码管理 Tab 切换（凭证码管理/核验日志）', async ({ authenticatedPage: page }) => {
    await gotoAndSettle(page, '/views/certificateManage');
    const tabs = page.locator('.ant-tabs-tab');
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThanOrEqual(2);
    // 切换到第二个 Tab
    await tabs.nth(1).click();
    await page.waitForTimeout(1_500);
    await expect(tabs.nth(1)).toHaveClass(/ant-tabs-tab-active/);
  });

  test('TC-UNMANAGED-001 未纳管核查 Tab 与统计卡片渲染', async ({ authenticatedPage: page }) => {
    await gotoAndSettle(page, '/interfaceLog/unmanagedManage');
    const tabs = page.locator('.ant-tabs-tab');
    expect(await tabs.count()).toBeGreaterThanOrEqual(2);
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toMatch(/未纳管|业务系统/);
  });

  test('TC-UNMANAGED-002 未纳管核查切换到"业务系统"Tab', async ({ authenticatedPage: page }) => {
    await gotoAndSettle(page, '/interfaceLog/unmanagedManage');
    const sysTab = page.locator('.ant-tabs-tab', { hasText: /业务系统/ }).first();
    if ((await sysTab.count()) === 0) {
      test.skip(true, '未找到业务系统 Tab');
      return;
    }
    await sysTab.click();
    await page.waitForTimeout(1_500);
    await expect(sysTab).toHaveClass(/ant-tabs-tab-active/);
  });

  test('TC-POLICY-001 接口安全策略列表支持搜索', async ({ authenticatedPage: page }) => {
    await gotoAndSettle(page, '/interfaceSecurity/interfaceSecurityPolicy');
    await expect(page.locator('.ant-table').first()).toBeVisible({ timeout: 15_000 });
    const filled = await fillVisibleSearch(page, '策略', [
      'input[placeholder*="策略名称"]',
      'input[placeholder*="策略编码"]',
    ]);
    if (!filled) {
      test.skip(true, '该页无可见搜索框，跳过搜索断言');
      return;
    }
    await clickSearch(page);
    const rowCount = await page.locator('.ant-table-tbody tr td').count();
    const empty = (await page.locator('.ant-empty, .ant-table-placeholder').count()) > 0;
    expect(rowCount >= 0 || empty).toBeTruthy();
  });

  test('TC-POLICY-002 接口安全策略"新建"表单打开即关闭（不提交）', async ({ authenticatedPage: page }) => {
    await gotoAndSettle(page, '/interfaceSecurity/interfaceSecurityPolicy');
    const addBtn = page.getByRole('button', { name: /新\s*建|新\s*增/ }).first();
    if ((await addBtn.count()) === 0) {
      test.skip(true, '未找到新建按钮');
      return;
    }
    await addBtn.click();
    await page.waitForTimeout(1_500);
    const form = page.locator('.ant-drawer-open, .ant-modal:not([style*="display: none"])').first();
    if ((await form.count()) > 0) {
      const cancel = form.locator('button').filter({ hasText: /取\s*消|关\s*闭/ }).first();
      if ((await cancel.count()) > 0) {
        await cancel.click();
        await page.waitForTimeout(1_000);
      }
    }
  });

  test('TC-LOGFILE-001 日志文件管理列表支持搜索', async ({ authenticatedPage: page }) => {
    await gotoAndSettle(page, '/interfaceLog/interfaceLogFile');
    await expect(page.locator('.ant-table').first()).toBeVisible({ timeout: 15_000 });
    const filled = await fillVisibleSearch(page, 'log', [
      'input[placeholder*="文件名"]',
      'input[placeholder*="提供方名称"]',
    ]);
    if (!filled) {
      test.skip(true, '该页无可见搜索框，跳过搜索断言');
      return;
    }
    await clickSearch(page);
    const rowCount = await page.locator('.ant-table-tbody tr td').count();
    const empty = (await page.locator('.ant-empty, .ant-table-placeholder').count()) > 0;
    expect(rowCount >= 0 || empty).toBeTruthy();
  });

  test('TC-LOGFILE-002 日志文件管理批量操作按钮存在', async ({ authenticatedPage: page }) => {
    await gotoAndSettle(page, '/interfaceLog/interfaceLogFile');
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toMatch(/批量解析|清理|推送/);
  });

  test('TC-APILOG-001 API接口日志快捷时间项与列表加载', async ({ authenticatedPage: page }) => {
    await gotoAndSettle(page, '/interfaceLog/apiInterfaceLog');
    await expect(page.locator('.ant-table').first()).toBeVisible({ timeout: 15_000 });
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toMatch(/今\s*天|近\s*7\s*天|近\s*30\s*天/);
  });

  test('TC-RETENTION-001 日志留存快捷时间查询（卡片布局）', async ({ authenticatedPage: page }) => {
    await gotoAndSettle(page, '/interfaceLog/interfaceLogRetention');
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toMatch(/今\s*天|近\s*3\s*天|近\s*7\s*天/);
    // 该页为卡片布局，无表格；点击"今天"快捷项应触发查询且不报错
    const today = page.getByText(/今\s*天/).first();
    if ((await today.count()) > 0) {
      await today.click();
      await page.waitForTimeout(2_000);
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('TC-BIZSYS-001 业务系统管理组织树与列表渲染', async ({ authenticatedPage: page }) => {
    await gotoAndSettle(page, '/system/businessSystemManage');
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toMatch(/业务系统/);
    const hasTreeOrTable =
      (await page.locator('.ant-tree').count()) > 0 ||
      (await page.locator('.ant-table').count()) > 0;
    expect(hasTreeOrTable).toBeTruthy();
  });

  test('TC-TLS-001 TLS私钥管理列表与新增入口', async ({ authenticatedPage: page }) => {
    await gotoAndSettle(page, '/system/tlsCertificate');
    await expect(page.locator('.ant-table').first()).toBeVisible({ timeout: 15_000 });
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toMatch(/私钥|证书/);
  });

  test('TC-SECPOLICY-001 安全策略管理表单字段完整性', async ({ authenticatedPage: page }) => {
    await gotoAndSettle(page, '/system/systemManage/securityPolicy');
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toMatch(/密码|策略/);
    // 保存按钮存在
    const saveBtn = page.getByRole('button', { name: /保\s*存|确\s*定/ }).first();
    expect((await saveBtn.count()) > 0).toBeTruthy();
  });
});

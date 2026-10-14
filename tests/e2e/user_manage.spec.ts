import { test, expect } from './fixtures';

/**
 * 模块：账号管理（系统管理中心 → 账号管理，/manage/userManage）
 *
 * 实测页面结构：
 *   - 搜索: #userInfo-search-loginName(登录帐号) / #userInfo-search-name(用户名称) / #org-search-btn(组织)
 *           查询按钮 #userInfo-search
 *   - 操作: "人员新增"按钮 → 右侧 ant-drawer（#userName/#userLoginName/#userLoginPassword/#userOrg 树选择）
 *   - 表格行操作为图标按钮 .action_btn：eye=查看详情(跳转 /details/user/:id)、edit=编辑、lock=重置密码、delete=删除
 *   - 分页: .ant-pagination（10 条/页）
 */

test.describe('账号管理', () => {

  async function gotoUserManage(page: any) {
    await page.goto('/manage/userManage');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.ant-table', { timeout: 20_000 });
  }

  test('TC-USER-001 账号列表正常加载且包含 admin 账号', async ({ authenticatedPage: page }) => {
    await gotoUserManage(page);
    await expect(page.locator('.ant-table-tbody tr').first()).toBeVisible({ timeout: 15_000 });
    const adminRow = page.locator('.ant-table-tbody tr').filter({ hasText: 'admin' }).first();
    await expect(adminRow).toBeVisible();
    expect(await adminRow.textContent()).toContain('超级管理员');
  });

  test('TC-USER-002 按登录帐号搜索可过滤出目标账号', async ({ authenticatedPage: page }) => {
    await gotoUserManage(page);
    await page.fill('#userInfo-search-loginName', 'admin');
    await page.click('#userInfo-search');
    await page.waitForTimeout(2_500);

    const rows = page.locator('.ant-table-tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(1);
    expect(await rows.first().textContent()).toContain('admin');
  });

  test('TC-USER-003 搜索不存在的账号返回空列表', async ({ authenticatedPage: page }) => {
    await gotoUserManage(page);
    await page.fill('#userInfo-search-loginName', 'zzz_no_such_user_zzz');
    await page.click('#userInfo-search');
    await page.waitForTimeout(2_500);

    const emptyVisible = (await page.locator('.ant-empty, .ant-table-placeholder').count()) > 0;
    const cellCount = await page.locator('.ant-table-tbody tr td').count();
    expect(emptyVisible || cellCount === 0).toBeTruthy();
  });

  test('TC-USER-004 点击"人员新增"打开新建抽屉表单', async ({ authenticatedPage: page }) => {
    await gotoUserManage(page);
    await page.click("button:has-text('人员新增')");
    await page.waitForSelector('.ant-drawer-open', { timeout: 10_000 });

    // 抽屉标题与核心字段应渲染
    const drawer = page.locator('.ant-drawer-content');
    await expect(drawer.locator('.ant-drawer-title')).toHaveText(/新建|新增/);
    for (const id of ['#userName', '#userLoginName', '#userLoginPassword']) {
      await expect(page.locator(id).first()).toBeVisible({ timeout: 5_000 });
    }
    // 关闭抽屉（取消），不实际创建数据
    await page.locator('.ant-drawer-content button').filter({ hasText: '取 消' }).click();
    await expect(page.locator('.ant-drawer-open')).toHaveCount(0, { timeout: 5_000 });
  });

  test('TC-USER-005 点击行"查看"图标进入用户详情页', async ({ authenticatedPage: page }) => {
    await gotoUserManage(page);
    const adminRow = page.locator('.ant-table-tbody tr').filter({ hasText: 'admin' }).first();
    await adminRow.locator('.action_btn .anticon-eye').first().click();
    // 跳转到 /details/user/:id 并展示详情字段
    await page.waitForURL(/\/details\/user\//, { timeout: 20_000 });
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toContain('详细信息');
    expect(bodyText).toContain('admin');
    expect(bodyText).toContain('超级管理员');
  });

  test('TC-USER-006 列表分页控件正常工作', async ({ authenticatedPage: page }) => {
    await gotoUserManage(page);
    const pagination = page.locator('.ant-pagination').first();
    if ((await pagination.count()) === 0) {
      test.skip(true, '当前数据量不足一页，跳过分页验证');
      return;
    }
    await expect(pagination).toBeVisible();
    const pagText = await pagination.textContent();
    expect(pagText).toMatch(/\d/);
    // 若存在第 2 页则翻页验证
    const page2 = pagination.locator('li.ant-pagination-item-2');
    if ((await page2.count()) > 0) {
      await page2.click();
      await page.waitForTimeout(2_500);
      await expect(page.locator('.ant-table').first()).toBeVisible();
    }
  });

  /**
   * 在抽屉表单中通过原生 setter + input/change 事件写入值（保证 Vue 响应式更新）。
   */
  async function setField(page: any, selector: string, value: string, isTextarea = false) {
    await page.evaluate(
      ([sel, val, ta]) => {
        const el = document.querySelector(sel) as HTMLInputElement | HTMLTextAreaElement | null;
        if (!el) return;
        const proto = ta ? (window as any).HTMLTextAreaElement.prototype : (window as any).HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')!.set;
        setter.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      },
      [selector, value, isTextarea],
    );
  }

  /** 打开日期选择面板并点击第一个可用日期单元格，必要时点面板"确定"。 */
  async function pickDate(page: any, placeholder: string) {
    const inp = page.locator(`.ant-drawer-open input[placeholder='${placeholder}']`);
    await inp.first().click({ force: true });
    await page.waitForTimeout(1_000);
    await page.evaluate(() => {
      const containers = [...document.querySelectorAll('.ant-calendar-picker-container')].filter(
        (c) => (c as HTMLElement).offsetParent !== null,
      ) as HTMLElement[];
      if (!containers.length) return;
      const c = containers[containers.length - 1];
      const cell = [...c.querySelectorAll('td.ant-calendar-cell')].find(
        (td) => !td.className.includes('disabled') && td.getAttribute('title'),
      ) as HTMLElement | undefined;
      if (cell) (cell.querySelector('.ant-calendar-date') || cell).click();
    });
    await page.waitForTimeout(600);
    await page.evaluate(() => {
      const containers = [...document.querySelectorAll('.ant-calendar-picker-container')].filter(
        (c) => (c as HTMLElement).offsetParent !== null,
      ) as HTMLElement[];
      if (!containers.length) return;
      const okBtn = containers[containers.length - 1].querySelector('.ant-calendar-ok-btn');
      if (okBtn) (okBtn as HTMLElement).click();
    });
    await page.waitForTimeout(500);
  }

  test('TC-USER-007 真实新增人员成功并可检索（写闭环）', async ({ authenticatedPage: page }) => {
    await gotoUserManage(page);
    const ts = Date.now();
    const loginName = `autotest_${ts}`;

    await page.click("button:has-text('人员新增')");
    await page.waitForSelector('.ant-drawer-open', { timeout: 10_000 });
    await page.waitForTimeout(800);

    // 必填项：用户名称 / 登录帐号 / 登录密码 / 移动电话 / 电子邮箱 / 所属组织 / 生效时间 / 描述
    await setField(page, '#userName', `测试${ts}`);
    await setField(page, '#userLoginName', loginName);
    await setField(page, '#userLoginPassword', 'Test@12345');
    await setField(page, '#userPhone', '13800000000');
    await setField(page, '#userEmail', `autotest${ts}@example.com`);
    await setField(page, '#userRemark', '自动化测试备注', true);

    // 所属组织：下拉选择"数据安全"
    await page.click('#userOrg');
    await page.waitForTimeout(1_200);
    const orgOption = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) li', { hasText: '数据安全' }).first();
    if ((await orgOption.count()) > 0) {
      await orgOption.click();
    } else {
      // 兜底：选择第一个可选组织
      await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) li').first().click();
    }
    await page.waitForTimeout(800);

    // 生效时间：开始/结束各选一个可用日期
    await pickDate(page, '请选择开始生效时间');
    await pickDate(page, '请选择结束生效时间');

    // 提交（确定按钮为 .ant-drawer-content 内最后一个 primary 按钮）
    const createApi = page.waitForResponse(
      (r) => r.url().includes('/scmp-manage/user/create') && r.request().method() === 'POST',
      { timeout: 15_000 },
    );
    await page.locator('.ant-drawer-content button.ant-btn-primary').last().click();
    const resp = await createApi;
    expect(resp.status()).toBe(200);

    // 抽屉应关闭
    await expect(page.locator('.ant-drawer-open')).toHaveCount(0, { timeout: 10_000 });

    // 重新搜索可看到新用户
    await page.fill('#userInfo-search-loginName', loginName);
    await page.click('#userInfo-search');
    await page.waitForTimeout(2_500);
    const row = page.locator('.ant-table-tbody tr').filter({ hasText: loginName }).first();
    await expect(row).toBeVisible({ timeout: 10_000 });

    // 说明：产生的 autotest_* 账号不自动删除，需定期人工清理
  });

  test('TC-USER-008 人员新增空表单提交触发必填项校验', async ({ authenticatedPage: page }) => {
    await gotoUserManage(page);
    await page.click("button:has-text('人员新增')");
    await page.waitForSelector('.ant-drawer-open', { timeout: 10_000 });
    await page.waitForTimeout(800);

    // 空表单直接点"确定"
    await page.locator('.ant-drawer-content button.ant-btn-primary').last().click();
    await page.waitForTimeout(1_500);

    // 应出现必填项校验提示（如"请输入移动电话!"等），且抽屉保持打开、未发起创建请求
    const alerts = await page.evaluate(() =>
      [...document.querySelectorAll('[role="alert"],[aria-live],.ant-form-explain,.has-error')]
        .map((e) => (e.textContent || '').trim())
        .filter(Boolean),
    );
    expect(alerts.length).toBeGreaterThanOrEqual(1);
    expect(await page.locator('.ant-drawer-open').count()).toBe(1);

    // 关闭抽屉
    await page.locator('.ant-drawer-content button').filter({ hasText: '取 消' }).click();
    await expect(page.locator('.ant-drawer-open')).toHaveCount(0, { timeout: 5_000 });
  });

  test('TC-USER-009 人员新增超长输入触发长度校验（描述>256字符）', async ({ authenticatedPage: page }) => {
    await gotoUserManage(page);
    await page.click("button:has-text('人员新增')");
    await page.waitForSelector('.ant-drawer-open', { timeout: 10_000 });
    await page.waitForTimeout(800);

    // 填写其余必填项，仅描述超长
    await setField(page, '#userName', '长度校验');
    await setField(page, '#userLoginName', `autotest_len_${Date.now()}`);
    await setField(page, '#userLoginPassword', 'Test@12345');
    await setField(page, '#userPhone', '13800000000');
    await setField(page, '#userEmail', 'len@example.com');
    await setField(page, '#userRemark', '长'.repeat(300), true);
    await page.click('#userOrg');
    await page.waitForTimeout(1_000);
    await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) li').first().click();
    await page.waitForTimeout(600);
    await pickDate(page, '请选择开始生效时间');
    await pickDate(page, '请选择结束生效时间');

    await page.locator('.ant-drawer-content button.ant-btn-primary').last().click();
    await page.waitForTimeout(1_500);

    const alerts = await page.evaluate(() =>
      [...document.querySelectorAll('[role="alert"],[aria-live],.ant-form-explain,.has-error')]
        .map((e) => (e.textContent || '').trim())
        .filter(Boolean),
    );
    expect(alerts.some((a) => a.includes('256'))).toBeTruthy();
    expect(await page.locator('.ant-drawer-open').count()).toBe(1);

    await page.locator('.ant-drawer-content button').filter({ hasText: '取 消' }).click();
    await expect(page.locator('.ant-drawer-open')).toHaveCount(0, { timeout: 5_000 });
  });
});

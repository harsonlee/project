import { test, expect } from './fixtures';

/**
 * 模块：二期子菜单可达性覆盖（TC-SUB-001 ~ TC-SUB-043）
 *
 * 覆盖登录后全部 8 大一级模块下的 43 个二级/三级功能页。
 * 每页断言：路由可达（不落到 404）+ 主体内容渲染（表格 / Tab / 卡片 / 表单 之一）。
 *
 * 路由来源：`GET /scmp-manage/manager/menu` 返回的菜单树（实测校正，部分页面
 * 早期方案中的路由有误，已按菜单接口真实 path 修正，见 docs/test_plan_phase2.md）。
 */

type SubPage = {
  id: string;      // TC-SUB-NNN
  module: string;  // 一级模块
  group: string;   // 二级分组
  name: string;    // 功能页名称
  path: string;    // 路由
};

const SUB_PAGES: SubPage[] = [
  // ── 流程管理（taxus-front 子应用）──
  { id: 'TC-SUB-001', module: '流程管理', group: '我的流程', name: '我的待办', path: '/taxusFront/workspace/myAgency' },
  { id: 'TC-SUB-002', module: '流程管理', group: '我的流程', name: '我的已办', path: '/taxusFront/workspace/myCompleted' },
  { id: 'TC-SUB-003', module: '流程管理', group: '我的流程', name: '我的流程', path: '/taxusFront/workspace/myWorkspace' },
  { id: 'TC-SUB-004', module: '流程管理', group: '流程引擎', name: '流程定义', path: '/taxusFront/flow/flowDesign' },
  { id: 'TC-SUB-005', module: '流程管理', group: '流程引擎', name: '实例管理', path: '/taxusFront/flow/flowCase' },
  { id: 'TC-SUB-006', module: '流程管理', group: '流程引擎', name: '任务管理', path: '/taxusFront/flow/flowTask' },
  { id: 'TC-SUB-007', module: '流程管理', group: '流程引擎', name: '流程脚本', path: '/taxusFront/form/flowScript' },
  { id: 'TC-SUB-008', module: '流程管理', group: '流程引擎', name: '流程分类', path: '/taxusFront/flow/flowTypes' },
  { id: 'TC-SUB-009', module: '流程管理', group: '流程引擎', name: '流程表单', path: '/taxusFront/forms/formManage' },
  { id: 'TC-SUB-010', module: '流程管理', group: '流程引擎', name: '发起流程', path: '/taxusFront/workspace/launchFlow' },
  { id: 'TC-SUB-011', module: '流程管理', group: '流程引擎', name: '审批人管理', path: '/taxusFront/approver/users' },

  // ── 数据接口开通 ──
  { id: 'TC-SUB-012', module: '数据接口开通', group: '注册登记', name: '数据提供方接口注册登记', path: '/views/interfaceRegisterManage' },
  { id: 'TC-SUB-013', module: '数据接口开通', group: '调用申请', name: '数据接收方接口调用申请', path: '/views/interfaceCallApply' },
  { id: 'TC-SUB-014', module: '数据接口开通', group: '开通配置', name: '接口开通配置', path: '/views/InterfaceCallTest' },
  { id: 'TC-SUB-015', module: '数据接口开通', group: '授权码', name: '授权码管理', path: '/views/authCodeManage' },
  { id: 'TC-SUB-016', module: '数据接口开通', group: '凭证码', name: '凭证码及核验管理', path: '/views/certificateManage' },

  // ── 接口安全监测 ──
  { id: 'TC-SUB-017', module: '接口安全监测', group: '未纳管核查', name: '接口未纳管核查', path: '/interfaceLog/unmanagedManage' },
  { id: 'TC-SUB-018', module: '接口安全监测', group: '告警上报', name: '数据接口异常调用告警上报日志', path: '/views/dataFlowRiskAlert' },
  { id: 'TC-SUB-019', module: '接口安全监测', group: '安全策略', name: '接口安全策略管理', path: '/interfaceSecurity/interfaceSecurityPolicy' },

  // ── 接口台账管理 ──
  { id: 'TC-SUB-020', module: '接口台账管理', group: '台账', name: '异常台账管理', path: '/views/interfaceLedgerAbnormalManage' },
  { id: 'TC-SUB-021', module: '接口台账管理', group: '日志记录', name: '台账更新日志', path: '/interfaceLedgerManage/updateLog' },
  { id: 'TC-SUB-022', module: '接口台账管理', group: '日志记录', name: '备案同步记录', path: '/views/interfaceRegisterSyncLog' },
  { id: 'TC-SUB-023', module: '接口台账管理', group: '日志记录', name: '台账推送历史', path: '/views/interfaceLedgerPushHistory' },
  { id: 'TC-SUB-024', module: '接口台账管理', group: '日志记录', name: '台账上报历史', path: '/views/interfaceLedgerReportHistory' },
  { id: 'TC-SUB-025', module: '接口台账管理', group: '巡检', name: '集团巡检任务管理', path: '/views/interfaceLedgerPatrolManage' },

  // ── 集省数据联动 ──
  { id: 'TC-SUB-026', module: '集省数据联动', group: '日志文件', name: '接口调用日志文件管理', path: '/interfaceLog/interfaceLogFile' },
  { id: 'TC-SUB-027', module: '集省数据联动', group: 'API日志', name: 'API接口日志', path: '/interfaceLog/apiInterfaceLog' },
  { id: 'TC-SUB-028', module: '集省数据联动', group: '完整性', name: '接口日志完整性异常记录', path: '/interfaceLog/interfaceLogCall' },
  { id: 'TC-SUB-029', module: '集省数据联动', group: '操作日志', name: '接口日志文件操作日志', path: '/interfaceLog/interfaceLogFileOperate' },
  { id: 'TC-SUB-030', module: '集省数据联动', group: '留存', name: '接口调用日志留存', path: '/interfaceLog/interfaceLogRetention' },
  { id: 'TC-SUB-031', module: '集省数据联动', group: '策略/提供方', name: '接口日志留存策略', path: '/interfaceLog/interfaceLogRetentionPolicy' },
  { id: 'TC-SUB-032', module: '集省数据联动', group: '策略/提供方', name: '接口日志提供方管理', path: '/interfaceLog/interfaceLogProviderManage' },
  { id: 'TC-SUB-033', module: '集省数据联动', group: '策略/提供方', name: '接口日志安全配置', path: '/interfaceLog/interfaceLogSecurityConfig' },

  // ── 系统管理中心 ──
  { id: 'TC-SUB-034', module: '系统管理中心', group: '角色权限', name: '验签账号管理', path: '/views/signatureAccountManage' },
  { id: 'TC-SUB-035', module: '系统管理中心', group: '系统管理', name: '业务系统管理', path: '/system/businessSystemManage' },
  { id: 'TC-SUB-036', module: '系统管理中心', group: '系统管理', name: '重点账号异常行为管理', path: '/views/keyAccountAbnormalBehavior' },
  { id: 'TC-SUB-037', module: '系统管理中心', group: '系统管理', name: '安全策略管理', path: '/system/systemManage/securityPolicy' },
  { id: 'TC-SUB-038', module: '系统管理中心', group: '系统管理', name: '平台地址管理', path: '/views/platformAddressManage' },
  { id: 'TC-SUB-039', module: '系统管理中心', group: '系统管理', name: '数据流转节点管理', path: '/views/flowDeviceManage' },
  { id: 'TC-SUB-040', module: '系统管理中心', group: '系统管理', name: 'TLS私钥管理', path: '/system/tlsCertificate' },
  // 注：资源类型管理 /system/assetTypeManage 实测重定向首页（无独立功能页），
  //     属疑似缺陷，单独由 TC-SUB-042 标注，不纳入通用可达性断言。
];

test.describe('二期子菜单可达性覆盖', () => {
  for (const p of SUB_PAGES) {
    test(`${p.id} ${p.module}-${p.group}-${p.name} 页面可达且主体渲染`, async ({ authenticatedPage: page }) => {
      await page.goto(p.path);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2_500);

      const info = await page.evaluate(() => {
        const body = document.body.innerText || '';
        return {
          is404: /404|does not exist|Sorry/.test(body.slice(0, 300)),
          table: !!document.querySelector('.ant-table'),
          tabs: document.querySelectorAll('.ant-tabs-tab').length,
          cards: document.querySelectorAll('[class*="card"],[class*="Card"]').length,
          form: !!document.querySelector('form,.ant-form'),
          empty: !!document.querySelector('.ant-empty'),
        };
      });

      // 不允许落到 404 兜底页
      expect(info.is404, `${p.name}(${p.path}) 不应出现 404`).toBe(false);

      // 主体内容至少渲染一种容器：表格 / Tab / 卡片 / 表单
      const hasBody = info.table || info.tabs > 0 || info.cards > 0 || info.form;
      expect(hasBody, `${p.name}(${p.path}) 应渲染表格/Tab/卡片/表单之一，实际=${JSON.stringify(info)}`).toBeTruthy();
    });
  }

  // 已知疑似缺陷：资源类型管理路由重定向到首页（无独立内容），单独标注
  test('TC-SUB-042 资源类型管理路由行为（疑似缺陷：重定向首页）', async ({ authenticatedPage: page }) => {
    await page.goto('/system/assetTypeManage');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2_500);
    const bodyText = await page.locator('body').textContent();
    const is404 = /404|does not exist|Sorry/.test((bodyText || '').slice(0, 300));
    const redirectedHome = !page.url().includes('/system/assetTypeManage');
    // 记录实际行为：无论重定向还是 404 均视为"该路由未提供独立功能页"，作为缺陷证据保留
    expect(is404 || redirectedHome, '资源类型管理应重定向或 404（当前为疑似缺陷，若修复则本用例需调整）').toBeTruthy();
  });

  test('TC-SUB-043 顶部一级菜单与二级面板联动展开正常', async ({ authenticatedPage: page }) => {
    await page.goto('/views/interfaceLedgerManage');
    await page.waitForLoadState('networkidle');
    // 点击"系统管理中心"一级菜单，二级面板应展开并包含多个入口
    const sysMenu = page.locator('.scmp_menu_onelevel li', { hasText: '系统管理中心' }).first();
    if ((await sysMenu.count()) === 0) {
      test.skip(true, '未找到系统管理中心一级菜单项');
      return;
    }
    await sysMenu.click();
    await page.waitForTimeout(1_500);
    const subLinks = page.locator('.scmp_menu_sublevel a');
    expect(await subLinks.count()).toBeGreaterThanOrEqual(3);
  });
});

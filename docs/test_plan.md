# 数据流转安全管理平台 — Web 端自动化测试方案

## 1. 项目概述

| 项 | 内容 |
| --- | --- |
| 被测系统 | 数据流转安全管理平台（SCMP） |
| 环境地址 | https://172.16.5.94/user/login |
| 技术栈 | Vue + Ant Design Pro（SPA），Nginx 前端托管，后端微服务（scmp-manage / scmp-system / clover / kayle 等） |
| 认证方式 | RSA 动态公钥加密（用户名+密码均加密）→ JWT Token（Header: `Authorization: JWT <token>`） |
| 测试账号 | admin / 123456（超级管理员，admin_role） |
| 测试范围 | Web 端主要功能：登录、导航、账号管理、接口台账、异常告警、系统管理、会话安全 |

### 1.1 关键机制说明（实测确认）

1. **RSA 加密登录**：每次登录前调用 `GET /scmp-manage/manager/get_key` 获取动态 RSA 公钥；前端用 JSEncrypt（PKCS1v15）分别加密 `username` 与 `password` 后以 Base64 提交至 `POST /scmp-manage/manager/login`。**仅加密密码而用户名明文会登录失败，两个字段都必须加密。**
2. **单点登录互踢**：同一主账号新登录会使旧会话立即失效（后续请求返回 401"您已被迫下线"）。自动化执行必须串行（workers=1），API 测试与 E2E 测试不可同时运行。
3. **登出接口缺陷**：`POST /scmp-manage/manager/logout` 对多种请求形态均返回 HTTP 500（"系统错误"），但服务端实际已使 token 失效。属待修复缺陷。
4. **验证码关闭**：`get_login_config` 返回 `needCaptcha: false`，当前环境无需处理图形验证码。
5. **自签名证书**：内网 HTTPS 自签证书，测试框架需跳过证书校验。

## 2. 测试策略

采用 **双层测试金字塔**：

```
        /\        E2E（Playwright + Chromium）
       /  \       覆盖 UI 交互主流程：登录、导航、表单、列表
      /    \
     / API  \     pytest + requests
    /________\    覆盖接口契约：认证、鉴权、核心业务 CRUD
   /  单元(建议) \  （由开发侧补充，本方案不涉及）
```

- **E2E 层**：验证用户真实操作路径（UI 渲染、路由守卫、表单校验、菜单完整性）。
- **API 层**：验证接口契约与鉴权边界（更快、更稳定，作为回归主力）。

## 3. 技术选型

| 组件 | 选型 | 理由 |
| --- | --- | --- |
| E2E 框架 | Playwright Test (TypeScript) | 自动等待、网络拦截、trace/视频/截图、storageState 复用登录态 |
| 浏览器 | Chromium | 与被测系统目标浏览器一致 |
| API 框架 | pytest + requests | 轻量、fixture 复用、JUnit XML 输出 |
| 报告 | Playwright HTML/JUnit + 自研 Markdown 汇总脚本 | 一份总报告聚合两层结果 |
| RSA 加密 | openssl CLI（Python 侧）/ 浏览器原生 JS（E2E 侧） | 与前端 JSEncrypt 行为等价（PKCS1v15 + Base64） |

## 4. 测试范围与模块划分

基于登录后 `/scmp-manage/manager/menu` 返回的完整菜单树（60+ 功能点），本期覆盖核心模块：

| 模块 | 路由 | 优先级 | 用例数 |
| --- | --- | --- | --- |
| 系统登录 | /user/login | P0 | 6 (E2E) + 5 (API) |
| 会话与安全 | - | P0 | 4 (E2E) + 4 (API) |
| 主界面导航 | / | P0 | 6 |
| 账号管理 | /manage/userManage | P1 | 6 |
| 接口台账管理 | /views/interfaceLedgerManage | P1 | 4 |
| 异常调用监测及告警 | /views/riskAlertManage, /riskAlert/riskAlertRule | P1 | 4 |
| 系统管理中心（角色/组织/字典/日志/公告） | /system/* | P2 | 10 |
| **二期：43 个子菜单可达性 + 交互层** | 见 test_plan_phase2.md | P0/P1 | 43 + ~25 |

**二期已纳入**（详见 `docs/test_plan_phase2.md`）：流程引擎（taxus-front）、数据接口开通全流程、接口安全监测、集省数据联动、TLS 私钥管理、重点账号异常行为等全部二级/三级子菜单。
**仍不覆盖**（三期）：金库审批（treasury）深度流、NSM 阻断规则、性能/并发专项、兼容性矩阵。

## 5. 目录结构

```
apimonitor/
├── package.json                 # Playwright 依赖与脚本
├── playwright.config.ts         # E2E 配置（串行、HTTPS 跳过、zh-CN）
├── docs/
│   ├── test_plan.md             # 本方案
│   └── test_report.md           # 生成的测试报告
├── tests/
│   ├── e2e/
│   │   ├── fixtures.ts          # 登录 fixture + storageState 复用
│   │   ├── login.spec.ts        # TC-LOGIN-*
│   │   ├── navigation.spec.ts   # TC-NAV-*
│   │   ├── user_manage.spec.ts  # TC-USER-*
│   │   ├── interface_ledger.spec.ts  # TC-LEDGER-*
│   │   ├── risk_alert.spec.ts   # TC-RISK-*
│   │   ├── system_manage.spec.ts    # TC-SYS-*
│   │   ├── submenu_coverage.spec.ts # TC-SUB-* 43 子菜单可达性（二期）
│   │   ├── phase2_business.spec.ts  # TC-FLOW/REG/APPLY/... 交互层（二期）
│   │   └── session_security.spec.ts # TC-SEC-*（含 UI 退出登录，破坏性，最后执行）
│   └── api/
│       ├── conftest.py          # RSA 登录 fixture
│       ├── test_auth_api.py     # 登录/Token/公开接口
│       └── test_business_api.py # 账号/公告/菜单接口
├── scripts/
│   └── generate_report.py       # 汇总 JUnit XML → Markdown 报告
└── test-results/                # 运行产物（report/、results.xml、artifacts/）
```

## 6. 环境与执行

### 6.1 前置条件

- Node.js ≥ 18（本机 v24.14.1 ✓）、Python ≥ 3.10（本机 3.12.9 ✓）
- openssl（macOS 自带 ✓）
- 可访问 172.16.5.94 的内网网络
- 首次安装：

```bash
npm install
npx playwright install chromium
pip3 install requests pytest
```

### 6.2 执行命令

```bash
# E2E（headless）
npm run test:e2e

# E2E（有头调试）
npm run test:e2e:headed

# API
npm run test:api

# 全部 + 生成报告
npm run test:all
python3 scripts/generate_report.py
```

> ⚠️ E2E 与 API 测试都会占用 admin 单点会话，**不可并行执行**。

## 7. 风险与应对

| 风险 | 影响 | 应对 |
| --- | --- | --- |
| 单点登录互踢导致用例间干扰 | 高 | workers=1 串行；storageState 复用登录态减少登录次数；TC-SEC 破坏性用例放最后 |
| SPA 渲染慢/选择器漂移 | 中 | 宽松选择器（placeholder + role 双定位）；networkidle 等待；超时放宽 |
| 测试数据残留（新增用户） | 中 | 使用 `autotest_<timestamp>` 唯一前缀；文档注明定期清理 |
| 后端接口偶发 500（如 logout） | 中 | API 断言以"实际效果"为准（token 失效）而非状态码；已知问题记入报告 |
| 动态公钥变化 | 低 | 每次登录实时获取 get_key，已适配 |

## 8. 交付物

1. 可运行的自动化测试工程（E2E + API）
2. 测试用例集（一期 56 条 + 二期约 72 条，编号 TC-*；含 43 条子菜单可达性、真实新增人员写闭环、UI 退出登录、必填/长度/空值校验）
3. Markdown 测试报告（含通过率、分模块统计、失败详情、已知问题）
4. Playwright HTML 报告（交互明细、trace/视频/截图）

## 9. 实测确认的页面结构速查（编写用例时参考）

| 区域 | 选择器 |
| --- | --- |
| 登录-用户名 / 密码 / 按钮 | `#username` / `#password` / `button.login-button`（文本"确 定"） |
| 登录失败提示 | `.ant-notification-notice`（右上角通知，非 .ant-message） |
| 顶部一级菜单 | `.scmp_menu_onelevel li`（流程管理/数据接口开通/接口安全监测/接口台账管理/集省数据联动/系统管理中心） |
| 二级功能面板 | 点击一级项后出现 `.scmp_menu_sublevel`，入口为 `<a href="/xxx" id="menuName">` |
| 右上角用户区 | `.scmp_right_menu`（显示 admin） |
| Token 存储 | localStorage `Access-Token`（值形如 `JWT <hex>`）；sessionStorage `store_state` |
| 账号管理-搜索/查询 | `#userInfo-search-loginName` / `#userInfo-search-name` / `#org-search-btn` / 按钮 `#userInfo-search` |
| 账号管理-新增 | 按钮"人员新增" → `.ant-drawer-open`，字段 `#userName/#userLoginName/#userLoginPassword/#userOrg`(树选择) |
| 表格行操作图标 | `.action_btn .anticon-eye`(查看→跳转 /details/user/:id) / `.anticon-edit`(编辑) / `.anticon-lock`(重置密码) / `.anticon-delete`(删除) |
| 台账页-搜索 | `input[placeholder*="搜索接口名称"]` + 按钮"搜 索"；工具栏：新建接口/导出台账/上报集团/推送台账/模板下载/导入/批量删除 |
| 告警页-筛选 | 接口名称/URL 输入框 + 4 个 `.ant-select`（状态如 待推送/推送成功/推送失败）+ 查询/重置/刷新 |
| 规则配置页 | `/riskAlert/riskAlertRule`：通用配置/接口级配置 Tab，展示"N 条监测行为，已启用 N 条" |

### 已知限制（影响用例设计）

> ⚠️ 以下两条一期结论经二期实测**已纠正**（用户确认 + 自动化复现成功）：

- ~~写操作无法端到端闭环~~ → **已可闭环**。人员新增需填写**全部必填项**（用户名称/登录帐号/登录密码/移动电话/电子邮箱/所属组织/开始&结束生效时间/描述）后点"确 定"才会触发 `POST /scmp-manage/user/create`；缺任一必填项仅显示内联校验、不发请求。TC-USER-007 已实现真实新增并检索验证。
- ~~台账行"查看"图标点击无响应~~ → **可正常打开详情**。点击 eye 图标的可点击祖先会弹出"查看接口台账"详情弹窗。TC-LEDGER-003 已恢复为真实详情断言。
- **登出接口恒 500（API 直连）**：UI 流程下 logout 返回 200 并跳转登录页；API 直连恒 500 但 token 实际失效。断言以"旧 token 变 401 / UI 跳转登录页"为准。
- **资源类型管理路由重定向首页**：`/system/assetTypeManage` 无独立功能页，疑似缺陷，已在 TC-SUB-042 标注。

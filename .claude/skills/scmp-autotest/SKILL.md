---
name: scmp-autotest
description: 数据流转安全管理平台（SCMP）Web 端自动化测试技能。当用户要求运行、调试、扩展该系统的自动化测试，或询问登录加密机制、单点登录限制、测试报告生成时使用。触发词：跑测试、执行用例、SCMP、172.16.5.94、测试报告、新增用例。
---

# SCMP Web 自动化测试技能

## 被测系统关键事实（实测确认，勿重新探测）

- 地址：`https://172.16.5.94/user/login`（自签名证书，必须跳过校验）
- 账号：`admin / 123456`（超级管理员，admin_role）
- **登录协议**：每次登录前 `GET /scmp-manage/manager/get_key` 取动态 RSA 公钥 → 用 PKCS1v15 分别加密 `username` 和 `password`（两个字段都必须加密，仅加密密码会失败）→ Base64 后 `POST /scmp-manage/manager/login` → 返回 JWT token
- 鉴权头：`Authorization: JWT <token>`；Token 存于 localStorage `Access-Token`（值形如 `JWT <hex>`）
- **单点登录互踢**：同账号新登录立即踢掉旧会话（401，message 可能为"未授权"或"您已被迫下线"）。E2E 与 API 测试不可并行；E2E 必须 workers=1
- 已知缺陷：`POST /scmp-manage/manager/logout` 恒返回 HTTP 500，但 token 实际已失效——断言以"token 变 401"为准，不要断言 logout 的 200
- 验证码：`needCaptcha=false`，无需处理

## 页面结构速查（选择器）

- 登录页：`#username` / `#password` / `button.login-button`（文本"确 定"）；失败提示为 `.ant-notification-notice`（右上角，不是 .ant-message）
- 布局非标准 Ant Pro Sider：顶部横排一级菜单 `.scmp_menu_onelevel li`；点击后右侧展开 `.scmp_menu_sublevel`（入口 `<a href="/xxx" id="menuName">`）；右上角用户区 `.scmp_right_menu`
- 登录后默认落地页 `/views/interfaceLedgerManage`（接口台账管理）
- 账号管理 `/manage/userManage`：搜索 `#userInfo-search-loginName`、查询按钮 `#userInfo-search`；新增走 `.ant-drawer-open`，必填字段 `#userName/#userLoginName/#userLoginPassword/#userPhone/#userEmail/#userRemark` + `#userOrg`(下拉选组织) + 开始/结束生效时间(`.ant-calendar-picker` 点日期单元格+OK)；提交按钮 `.ant-drawer-content button.ant-btn-primary`（确 定）→ `POST /scmp-manage/user/create`；行操作图标 `.action_btn .anticon-eye`(查看→`/details/user/:id`) / `.anticon-edit` / `.anticon-lock` / `.anticon-delete`
- 台账页行"查看"：`.action_btn .anticon-eye` 的可点击祖先 → 弹出"查看接口台账"详情弹窗
- UI 退出登录：`.ant-pro-account-avatar` → "退出登录" → 确认框"确 定" → /user/login
- 台账页：`input[placeholder*="搜索接口名称"]` + "搜 索"按钮
- 告警页 `/views/riskAlertManage`：接口名称/URL 输入框 + `.ant-select` 状态筛选（待推送/推送成功/推送失败）+ 查询/重置
- 规则页 `/riskAlert/riskAlertRule`：通用配置/接口级配置 Tab，"共 N 条监测行为，已启用 N 条"

## 已知前端行为（写用例时注意，二期实测校正）

- **人员新增可真实闭环**：必须填写全部必填项（`#userName/#userLoginName/#userLoginPassword/#userPhone/#userEmail/#userOrg`(下拉选组织)/开始&结束生效时间(日历面板点日期+OK)/`#userRemark`）后点 `.ant-drawer-content button.ant-btn-primary`（确 定）才会触发 `POST /scmp-manage/user/create`。缺任一必填项仅显示内联校验（如"请输入移动电话!""最多输入256个字符!"）、不发请求。字段需用原生 setter + input/change 事件写入以触发 Vue 响应式。
- **台账行"查看"可正常打开详情**：点击 eye 图标的可点击祖先会弹出"查看接口台账"详情弹窗（含基本信息/接口名称等）。
- **UI 退出登录**：`.ant-pro-account-avatar` → "退出登录" → 确认框"您确定要注销吗？"→"确 定" → 跳转 /user/login。
- 角色列表不含"超级管理员"字样（admin 是用户不是角色名），角色页断言用表格行数/搜索过滤
- 资源类型管理 `/system/assetTypeManage` 重定向首页（疑似缺陷）

## 常用命令

```bash
cd /Users/harsonlee/work/workspace/aitest/apimonitor

# 安装（首次）
npm install && npx playwright install chromium
pip3 install requests pytest

# 运行 E2E（headless）
npm run test:e2e

# 运行单个 spec
npx playwright test tests/e2e/login.spec.ts

# 有头模式调试（观察 UI）
npx playwright test --headed tests/e2e/login.spec.ts

# 运行 API 测试
python3 -m pytest tests/api -v

# 查看 HTML 报告
npx playwright show-report

# 生成 Markdown 总报告
python3 scripts/generate_report.py
```

## 工作流

### 运行全部测试并出报告
1. `npm run test:e2e`（先 E2E，会产生 `test-results/results.xml`）
2. `python3 -m pytest tests/api -v --junitxml=test-results/api_results.xml`（后 API，因单点登录互斥）
3. `python3 scripts/generate_report.py` → 输出 `docs/test_report.md`
4. 向用户汇报：通过率、分模块统计、失败用例、已知问题

### 调试单个失败用例
1. 用 `--headed --debug` 或 `npx playwright test <file> --trace on` 复现
2. 查看 `test-results/artifacts/` 下的 trace.zip（`npx playwright show-trace <zip>`）、截图、视频
3. SPA 选择器漂移时优先改 `placeholder`/`getByRole` 宽松定位，不要依赖 class 哈希

### 新增测试用例
1. 在对应 `tests/e2e/<module>.spec.ts` 追加 `test('TC-XXX-NNN 标题', ...)`，编号延续现有序列（二期子菜单可达性在 `submenu_coverage.spec.ts`，交互层在 `phase2_business.spec.ts`）
2. 同步更新 `docs/test_cases.md` 对应用例表
3. 涉及写操作（新增/编辑）的用例：使用 `autotest_<Date.now()>` 唯一前缀，不自动删除；人员新增需填全部必填项才触发 create
4. 破坏性会话用例（登出/互踢/UI 退出登录）只能放在 `session_security.spec.ts`
5. 子菜单路由以 `GET /scmp-manage/manager/menu` 返回的 path 为准（部分页面早期路由有误，已校正）

## 注意事项

- 所有浏览器 context 必须 `ignoreHTTPSErrors: true`
- E2E fixture `authenticatedPage` 会自动复用/刷新 `test-results/.auth/admin.json` 登录态，新写用例直接用该 fixture，不要自己重复登录
- API 侧 `logged_in_session` fixture 会占用 admin 会话，跑完 API 后再跑 E2E 会自动重新登录
- 后端偶发 500（如 menu POST 方式调用）：接口方法以 GET/POST 区分，参考 `tests/api/test_business_api.py` 中的正确用法

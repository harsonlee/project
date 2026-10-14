# 数据流转安全管理平台 — 二期子菜单功能测试方案

> 一期已覆盖：登录、会话安全、导航、账号管理（读）、接口台账（读）、异常告警处置/规则、系统管理中心 7 页面可达性。
> 二期目标：**将全部 60+ 二级/三级子菜单纳入自动化覆盖**，并补齐一期的写操作闭环（真实新增人员、台账详情查看）。

## 1. 子菜单全景（实测确认，共 8 大模块 43 个功能页）

| 一级模块 | 二级分组 | 功能页（路由） | 二期策略 |
| --- | --- | --- | --- |
| 流程管理 (taxus-front) | 我的流程 | 我的待办 `/taxusFront/workspace/myAgency`、我的已办 `myCompleted`、我的流程 `myWorkspace` | 列表加载 + 搜索 |
| | 流程引擎 | 流程定义 `/taxusFront/flow/flowDesign`、实例管理 `flowCase`、任务管理 `flowTask`、流程脚本 `form/flowScript`、流程分类 `flowTypes`、流程表单 `forms/formManage`、发起流程 `workspace/launchFlow`、审批人管理 `approver/users` | 列表加载 + 核心入口验证 |
| 数据接口开通 | 注册登记 | 数据提供方接口注册登记 `/views/interfaceRegisterManage`（新增/批量导入/模板下载） | 列表+搜索+新增抽屉打开 |
| | 调用申请 | 数据接收方接口调用申请 `/views/interfaceCallApply`（新建/删除，统计卡片：总数/待审批/已授权） | 列表+搜索+统计断言 |
| | 开通配置 | 接口开通配置 `/views/InterfaceCallTest`（查看参数） | 列表+查看参数弹窗 |
| | 授权码 | 授权码管理 `/views/authCodeManage`（导出/指导手册） | 列表+搜索+状态筛选 |
| | 凭证码 | 凭证码及核验管理 `/views/certificateManage`（组织机构树 + 日志留存凭证码管理/核验日志 Tab） | Tab 切换+列表 |
| 接口安全监测 | 未纳管核查 | 接口未纳管核查 `/interfaceLog/unmanagedManage`（未纳管接口/业务系统 Tab，统计卡片） | Tab+统计+搜索 |
| | 告警上报 | 数据接口异常调用告警上报日志 `/views/dataFlowRiskAlert`（风险类型筛选） | 列表+筛选 |
| | 安全策略 | 接口安全策略管理 `/interfaceSecurity/interfaceSecurityPolicy`（新建/删除/清空数据/导入） | 列表+新建表单校验 |
| 接口台账管理 | 台账 | 异常台账管理 `/views/interfaceLedgerAbnormalManage`（批次号/报告名称搜索，展开明细） | 列表+搜索 |
| | 日志记录 | 台账更新日志 `/interfaceLedgerManage/updateLog`、备案同步记录 `/views/interfaceRegisterSyncLog`、推送历史 `PushHistory`、上报历史 `ReportHistory` | 列表+时间范围查询 |
| | 巡检 | 集团巡检任务管理 `/views/interfaceLedgerPatrolManage`（模板下载/导入） | 列表+搜索 |
| 集省数据联动 | 日志文件 | 接口调用日志文件管理 `/interfaceLog/interfaceLogFile`（批量解析/清理/推送情况） | 列表+搜索 |
| | API日志 | API接口日志 `/interfaceLog/apiInterfaceLog`（今天/近7天/近30天快捷项+导出） | 快捷时间+列表 |
| | 完整性 | 接口日志完整性异常记录 `/interfaceLog/interfaceLogCall`（业务系统下拉） | 列表+筛选 |
| | 操作日志 | 接口日志文件操作日志 `/interfaceLog/interfaceLogFileOperate`（导出） | 列表+时间查询 |
| | 留存 | 接口调用日志留存 `/interfaceLog/interfaceLogRetention`（今天/近3天/近7天+导出，无表格为卡片布局） | 快捷时间+查询 |
| | 策略/提供方 | 接口日志留存策略 `RetentionPolicy`（新建/删除）、日志提供方管理 `ProviderManage`（新建/批量导入）、日志安全配置 `SecurityConfig`（只读+刷新） | 列表+新建表单校验 |
| 系统管理中心 | 角色权限 | 验签账号管理 `/views/signatureAccountManage`（新增/删除/导出） | 列表+搜索 |
| | 系统管理 | 业务系统管理 `/system/businessSystemManage`（组织树+新增/批量导入/更新日志）、公告管理（一期）、重点账号异常行为 `keyAccountAbnormalBehavior`（新增/导入）、安全策略管理 `/system/systemManage/securityPolicy`（密码策略表单+保存）、平台地址管理 `platformAddressManage`（联通验证/集团地址查询）、数据流转节点管理 `flowDeviceManage`（Agent 在线监控）、TLS 私钥管理 `/system/tlsCertificate`（新增私钥/批量导入） | 逐页可达+核心控件 |
| | 字典 | 资源类型管理 `/system/assetTypeManage`（路由重定向到首页，疑似缺陷→记入报告） | 可达性验证 |

## 2. 二期测试策略

### 2.1 三层用例结构

1. **可达性层（P0，43 页）**：每个子菜单页 `goto → networkidle → 主体渲染断言（表格/Tab/卡片/表单之一）+ 页面标题关键词`。统一由参数化用例生成，失败即定位到具体页面。
2. **交互层（P1，约 25 条）**：对每类页面的代表性交互做深度验证——搜索过滤、重置、时间快捷项（今天/近7天…）、Tab 切换、状态/类型下拉筛选、分页、导出按钮存在性。
3. **写操作层（P1，闭环）**：
   - **账号管理-真实新增人员**（用户确认"确定"可点击且新增成功）：填写 `#userName/#userLoginName/#userLoginPassword` + 组织树选择"数据安全" → 点 `.ant-drawer-content button.ant-btn-primary`（确 定）→ 断言成功提示 + 重新搜索可见新用户。**依赖**：登录帐号全局唯一（用 `autotest_<ts>` 前缀）；组织树固定选"数据安全"叶子节点。
   - **台账详情查看**（用户确认"查看"可点击）：首行 `.action_btn .anticon-eye` 真实点击 → 断言跳转/弹窗。
   - 其余写操作（策略新建、提供方新建等）本期只做**空表单校验**或**打开表单即关闭**，不真实落库，避免污染环境数据。

### 2.2 执行顺序与互斥约束

- 仍为 workers=1 串行；写操作用例（真实新增人员）放在该 spec 末尾，产生的 `autotest_*` 账号定期人工清理。
- 破坏性会话用例（TC-SEC-*）保持最后执行。
- API 与 E2E 不可并行（单点登录）。

### 2.3 已知前端限制的处理（据用户反馈修正）

| 一期结论 | 修正 |
| --- | --- |
| "人员新增提交无响应" | **错误**。确定按钮 `<button class="ant-btn ant-btn-primary"><span>确 定</span></button>` 可点击且新增成功 → 二期实现真实新增闭环用例 |
| "台账查看图标点击无响应" | **错误**。查看按钮可点击 → 二期恢复 TC-LEDGER-003 为真实详情查看断言 |
| 资源类型管理路由重定向首页 | 保留为可达性用例并在报告中标注疑似缺陷 |

## 3. 二期新增用例清单（编号延续）

| 编号段 | 模块 | 数量 |
| --- | --- | --- |
| TC-SUB-001~043 | 43 个子菜单页可达性（参数化） | 43 |
| TC-USER-007 | 真实新增人员成功并可检索（写闭环） | 1 |
| TC-LEDGER-003(修) | 台账行查看进入详情（恢复真实断言） | 1 |
| TC-FLOW-001~003 | 流程工作台（待办/已办/我的流程）搜索 | 3 |
| TC-REG-001~002 | 接口注册登记搜索/新增抽屉 | 2 |
| TC-APPLY-001~002 | 调用申请统计卡片/搜索 | 2 |
| TC-CALLTEST-001 | 接口开通配置"查看参数"弹窗 | 1 |
| TC-AUTHCODE-001~002 | 授权码搜索/状态筛选 | 2 |
| TC-CERT-001 | 凭证码 Tab 切换（凭证码管理/核验日志） | 1 |
| TC-UNMANAGED-001~002 | 未纳管核查 Tab/统计卡片 | 2 |
| TC-POLICY-001~002 | 安全策略搜索/新建表单校验 | 2 |
| TC-LOGFILE-001~002 | 日志文件管理搜索/批量按钮存在性 | 2 |
| TC-APILOG-001 | API 接口日志快捷时间+统计 | 1 |
| TC-RETENTION-001 | 日志留存快捷时间查询 | 1 |
| TC-BIZSYS-001 | 业务系统管理组织树+列表 | 1 |
| TC-TLS-001 | TLS 私钥列表/新增入口 | 1 |
| TC-SECPOLICY-001 | 安全策略表单字段完整性 | 1 |

合计二期新增约 **72 条**（含 43 条可达性）。

## 4. 交付物

- `tests/e2e/submenu_coverage.spec.ts` — 43 页可达性参数化
- `tests/e2e/phase2_business.spec.ts` — 各模块交互层用例
- `tests/e2e/user_manage.spec.ts` — 追加 TC-USER-007 真实新增闭环
- `tests/e2e/interface_ledger.spec.ts` — 恢复 TC-LEDGER-003 真实详情断言
- `docs/test_cases.md` / 本报告 / 总报告自动更新

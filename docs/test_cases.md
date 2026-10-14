# 测试用例清单

> 编号规则：TC-<模块>-<序号>。P0=冒烟必测，P1=核心功能，P2=一般功能。
> "验证点"为断言依据；E2E 对应用例已实现于 `tests/e2e/*.spec.ts`，API 对应 `tests/api/*.py`。

## 一、系统登录（P0）

| 编号 | 用例标题 | 前置条件 | 步骤 | 预期结果 | 层级 |
| --- | --- | --- | --- | --- | --- |
| TC-LOGIN-001 | 正确账号密码登录成功 | 未登录 | 1. 打开 /user/login<br>2. 输入 admin / 123456<br>3. 点击登录 | 跳转至系统首页，侧边菜单可见 | E2E |
| TC-LOGIN-002 | 错误密码登录失败 | 未登录 | 1. 输入 admin / 错误密码<br>2. 点击登录 | 提示"登录失败，用户名或密码错误"，停留在登录页 | E2E+API |
| TC-LOGIN-003 | 用户名为空提交 | 未登录 | 1. 仅填密码<br>2. 点击登录 | 表单校验拦截或登录失败，未进入系统 | E2E+API |
| TC-LOGIN-004 | 密码为空提交 | 未登录 | 1. 仅填用户名<br>2. 点击登录 | 表单校验拦截或登录失败，未进入系统 | E2E |
| TC-LOGIN-005 | 不存在的用户名 | 未登录 | 1. 输入无效用户名+任意密码<br>2. 登录 | 提示登录失败，停留在登录页 | E2E+API |
| TC-LOGIN-006 | 登录后页面标题正确 | 未登录 | 1. 正常登录<br>2. 查看浏览器标题 | 标题包含"数据流转安全管理平台" | E2E |
| TC-LOGIN-007 | 空值校验：用户名密码均空提交 | 未登录 | 两字段留空→点确定 | 停留登录页，不进入系统 | E2E |
| TC-LOGIN-008 | 长度校验：超长用户名(150字符) | 未登录 | 输入 150 字符用户名→登录 | 按登录失败处理，停留登录页 | E2E |
| TC-LOGIN-009 | 注入/特殊字符安全拒绝 | 未登录 | 用户名输入 SQL 注入串→登录 | 登录失败，停留登录页，无异常 | E2E |
| TC-API-AUTH-01 | 明文密码被拒绝 | - | POST login，username 加密、password 明文 | success=false（强制 RSA 加密） | API |
| TC-API-AUTH-02 | 登录配置公开可读 | - | GET get_login_config（无 token） | 200，needCaptcha=false | API |

## 二、会话与安全（P0）

| 编号 | 用例标题 | 步骤 | 预期结果 | 层级 |
| --- | --- | --- | --- | --- |
| TC-SEC-001 | 单点登录互踢 | 1. 浏览器 A 登录<br>2. 浏览器 B 同账号登录<br>3. A 再请求受保护接口 | A 收到 401"您已被迫下线" | E2E |
| TC-SEC-002 | 无效 Token 被拒绝 | 携带伪造 Authorization 请求 menu | 401 | E2E+API |
| TC-SEC-003 | 登出后会话失效 | 1. 登录<br>2. 调用 logout<br>3. 旧 token 请求 menu | 旧 token 返回 401（注意：logout 接口本身返回 500，为已知缺陷） | E2E |
| TC-SEC-004 | 连续错误密码不异常 | 连续 3 次错误密码登录 | 每次均提示失败并停留登录页，无 5xx | E2E |
| TC-SEC-005 | UI 退出登录闭环 | 1. 头像菜单→退出登录<br>2. 确认框点"确 定" | 跳转 /user/login，会话失效（破坏性，最后执行） | E2E |
| TC-API-AUTH-03 | 缺失 Token 被拒绝 | 不带 Authorization 请求 menu | 401 | API |
| TC-API-AUTH-04 | 有效 Token 访问菜单 | 登录后 GET menu | 200，返回完整菜单树 | API |

## 三、主界面导航（P0）

| 编号 | 用例标题 | 步骤 | 预期结果 | 层级 |
| --- | --- | --- | --- | --- |
| TC-NAV-001 | 首页加载与侧边菜单 | 登录后访问 / | 侧边栏、头部正常渲染 | E2E |
| TC-NAV-002 | 一级菜单完整性 | 检查菜单项 | 流程管理/数据接口开通/接口安全监测/接口台账管理/集省数据联动/系统管理中心 均可见 | E2E |
| TC-NAV-003 | 展开系统管理中心子菜单 | 点击"系统管理中心" | 出现账号管理/角色管理/组织机构管理等子项 | E2E |
| TC-NAV-004 | 进入账号管理页面 | 点击"账号管理" | URL 变为 /manage/userManage，表格/表单渲染 | E2E |
| TC-NAV-005 | 未登录访问受保护页被重定向 | 干净会话直接访问 /manage/userManage | 重定向到 /user/login | E2E |
| TC-NAV-006 | 顶部显示当前用户 | 登录后查看头部 | 显示"超级管理员"或 admin | E2E |

## 四、账号管理（P1）— /manage/userManage

| 编号 | 用例标题 | 步骤 | 预期结果 | 层级 |
| --- | --- | --- | --- | --- |
| TC-USER-001 | 列表加载含 admin | 进入页面 | 表格有数据，admin 行显示"超级管理员" | E2E+API |
| TC-USER-002 | 按登录名搜索 | 搜索框输入 admin → 查询 | 结果仅含匹配账号 | E2E+API |
| TC-USER-003 | 搜索无结果 | 搜索不存在的登录名 | 空态展示，无数据行 | E2E |
| TC-USER-004 | 打开新增抽屉表单 | 点击"人员新增" | 抽屉渲染核心字段，取消可关闭 | E2E |
| TC-USER-005 | 行"查看"进入用户详情 | 点 admin 行 eye 图标 | 跳转 /details/user/:id，展示详细信息 | E2E |
| TC-USER-006 | 分页控件 | 查看分页区 | 显示总条数/页码，可翻页 | E2E |
| TC-USER-007 | 真实新增人员成功并可检索（写闭环） | 填写全部必填项(名称/登录帐号/密码/手机/邮箱/组织/生效时间/描述)→确定 | POST user/create 返回 200，抽屉关闭，重新搜索可见新用户（autotest_* 需人工清理） | E2E |
| TC-USER-008 | 空表单提交触发必填校验 | 空表单直接点确定 | 出现 ≥1 条必填提示（如"请输入移动电话!"），抽屉保持打开 | E2E |
| TC-USER-009 | 超长输入长度校验 | 描述填 300 字符→确定 | 出现"最多输入256个字符!"提示，不提交 | E2E |
| TC-API-USER-01 | user/page 分页查询 | POST {pageNum:1,pageSize:10} | 200，data 含 admin | API |
| TC-API-USER-02 | user/search-list 精确查询 | POST {userLoginName:"admin"} | 200，命中 admin | API |

## 五、接口台账管理（P1）— /views/interfaceLedgerManage

| 编号 | 用例标题 | 步骤 | 预期结果 | 层级 |
| --- | --- | --- | --- | --- |
| TC-LEDGER-001 | 台账列表加载 | 进入页面 | 表格/空态渲染，页面含"台账"字样 | E2E |
| TC-LEDGER-002 | 按接口名称搜索 | 输入"用户资料查询"→查询 | 有匹配行或空态（环境数据依赖） | E2E |
| TC-LEDGER-003 | 点击行"查看"进入详情弹窗（真实断言） | 点击首行 eye 图标 | 弹出"查看接口台账"详情弹窗，含基本信息/接口名称等字段 | E2E |
| TC-LEDGER-004 | 分页切换 | 点击下一页 | 表格重新渲染正常 | E2E |

## 六、接口异常调用监测及告警（P1）

| 编号 | 用例标题 | 步骤 | 预期结果 | 层级 |
| --- | --- | --- | --- | --- |
| TC-RISK-001 | 告警处置列表加载 | 访问 /views/riskAlertManage | 页面含"告警/异常/监测"，主体渲染 | E2E |
| TC-RISK-002 | 按状态筛选 | 选择状态下拉项 | 列表刷新且正常渲染 | E2E |
| TC-RISK-003 | 监测规则配置页加载 | 访问 /riskAlert/riskAlertRule | 页面含"规则/配置"，主体渲染 | E2E |
| TC-RISK-004 | 新增规则空表单校验 | 点新增→不填→确定 | 触发 ≥1 条前端必填校验错误 | E2E |

## 七、系统管理中心（P2）

| 编号 | 用例标题 | 路由 | 预期结果 | 层级 |
| --- | --- | --- | --- | --- |
| TC-SYS-00x | 角色管理页可访问 | /system/roleManage | 含"角色"，主体渲染 | E2E |
| TC-SYS-00x | 组织机构管理页可访问 | /system/OrgManage | 含"组织/机构" | E2E |
| TC-SYS-00x | 用户组管理页可访问 | /system/UserGroupManage | 含"用户组" | E2E |
| TC-SYS-00x | 菜单管理页可访问 | /system/funcManage | 含"菜单" | E2E |
| TC-SYS-00x | 通用字典管理页可访问 | /system/dicManage | 含"字典" | E2E |
| TC-SYS-00x | 操作日志页可访问 | /system/syslog | 含"日志" | E2E |
| TC-SYS-00x | 公告管理页可访问 | /system/noticeManage | 含"公告" | E2E |
| TC-SYS-ROLE-001 | 角色列表含超级管理员 | /system/roleManage | 含"超级管理员/admin_role" | E2E+API |
| TC-SYS-DIC-001 | 字典新增空表单校验 | /system/dicManage | 空提交触发必填校验 | E2E |
| TC-SYS-LOG-001 | 操作日志时间范围查询 | /system/syslog | 选择时间后查询，列表正常 | E2E |
| TC-API-NOTICE-01 | sys-notice/page 查询 | POST {pageNum:1,pageSize:5} | 200，条目含 title/id | API |
| TC-API-MENU-01 | menu 返回完整菜单树 | GET menu | 含 flow_manage/interface_flow/system 等一级菜单 | API |
| TC-API-MENU-02 | role 返回当前用户信息 | GET role | username=admin，roleId=admin_role | API |

## 八、二期子菜单可达性覆盖（TC-SUB-001 ~ TC-SUB-043，P0）

> 路由来源：`GET /scmp-manage/manager/menu` 菜单树（实测校正）。断言：路由不落到 404 + 主体渲染（表格/Tab/卡片/表单之一）。

| 编号 | 模块 | 分组 | 功能页 | 路由 |
| --- | --- | --- | --- | --- |
| TC-SUB-001~003 | 流程管理 | 我的流程 | 我的待办/已办/我的流程 | /taxusFront/workspace/myAgency·myCompleted·myWorkspace |
| TC-SUB-004~011 | 流程管理 | 流程引擎 | 流程定义/实例/任务/脚本/分类/表单/发起/审批人 | /taxusFront/flow/* · form/flowScript · forms/formManage · approver/users |
| TC-SUB-012 | 数据接口开通 | 注册登记 | 数据提供方接口注册登记 | /views/interfaceRegisterManage |
| TC-SUB-013 | 数据接口开通 | 调用申请 | 数据接收方接口调用申请 | /views/interfaceCallApply |
| TC-SUB-014 | 数据接口开通 | 开通配置 | 接口开通配置 | /views/InterfaceCallTest |
| TC-SUB-015 | 数据接口开通 | 授权码 | 授权码管理 | /views/authCodeManage |
| TC-SUB-016 | 数据接口开通 | 凭证码 | 凭证码及核验管理 | /views/certificateManage |
| TC-SUB-017 | 接口安全监测 | 未纳管核查 | 接口未纳管核查 | /interfaceLog/unmanagedManage |
| TC-SUB-018 | 接口安全监测 | 告警上报 | 异常调用告警上报日志 | /views/dataFlowRiskAlert |
| TC-SUB-019 | 接口安全监测 | 安全策略 | 接口安全策略管理 | /interfaceSecurity/interfaceSecurityPolicy |
| TC-SUB-020 | 接口台账管理 | 台账 | 异常台账管理 | /views/interfaceLedgerAbnormalManage |
| TC-SUB-021~024 | 接口台账管理 | 日志记录 | 更新日志/备案同步/推送历史/上报历史 | /interfaceLedgerManage/updateLog · /views/interfaceRegisterSyncLog · interfaceLedgerPushHistory · interfaceLedgerReportHistory |
| TC-SUB-025 | 接口台账管理 | 巡检 | 集团巡检任务管理 | /views/interfaceLedgerPatrolManage |
| TC-SUB-026~033 | 集省数据联动 | 日志文件/API/完整性/操作/留存/策略 | 日志文件管理·API日志·完整性异常·操作日志·日志留存·留存策略·提供方管理·安全配置 | /interfaceLog/* |
| TC-SUB-034 | 系统管理中心 | 角色权限 | 验签账号管理 | /views/signatureAccountManage |
| TC-SUB-035~040 | 系统管理中心 | 系统管理 | 业务系统/重点账号/安全策略/平台地址/流转节点/TLS私钥 | /system/businessSystemManage · /views/keyAccountAbnormalBehavior · /system/systemManage/securityPolicy · /views/platformAddressManage · /views/flowDeviceManage · /system/tlsCertificate |
| TC-SUB-041 | 系统管理中心 | 字典 | 资源类型管理（疑似缺陷：重定向首页） | /system/assetTypeManage |
| TC-SUB-042 | 系统管理中心 | 字典 | 资源类型管理路由行为标注 | /system/assetTypeManage |
| TC-SUB-043 | 全局 | 导航 | 一级菜单与二级面板联动展开 | - |

## 九、二期交互层用例（P1）

| 编号 | 模块 | 用例 | 预期结果 | 层级 |
| --- | --- | --- | --- | --- |
| TC-FLOW-001~003 | 流程工作台 | 待办搜索/已办加载/发起流程入口 | 列表加载、搜索链路正常、入口可打开 | E2E |
| TC-REG-001~002 | 接口注册登记 | 列表搜索/新增抽屉打开即关闭 | 搜索正常；抽屉可开关不落库 | E2E |
| TC-APPLY-001~002 | 调用申请 | 统计卡片(总数/待审批/已授权)/搜索 | 卡片渲染；搜索正常 | E2E |
| TC-CALLTEST-001 | 开通配置 | "查看参数"弹窗 | 行内查看入口触发弹窗 | E2E |
| TC-AUTHCODE-001~002 | 授权码 | 搜索/状态筛选下拉 | 搜索正常；下拉有选项 | E2E |
| TC-CERT-001 | 凭证码 | Tab 切换（凭证码管理/核验日志） | 第二个 Tab 激活 | E2E |
| TC-UNMANAGED-001~002 | 未纳管核查 | Tab+统计/切换业务系统 Tab | Tab≥2；切换激活 | E2E |
| TC-POLICY-001~002 | 安全策略 | 搜索/新建表单打开即关闭 | 搜索正常；表单可开关 | E2E |
| TC-LOGFILE-001~002 | 日志文件管理 | 搜索/批量按钮存在 | 搜索正常；含批量解析/清理/推送 | E2E |
| TC-APILOG-001 | API接口日志 | 快捷时间项+列表 | 含今天/近7天/近30天；表格渲染 | E2E |
| TC-RETENTION-001 | 日志留存 | 快捷时间查询（卡片布局） | 含今天/近3天/近7天；点击不报错 | E2E |
| TC-BIZSYS-001 | 业务系统管理 | 组织树+列表 | 含"业务系统"；树或表格渲染 | E2E |
| TC-TLS-001 | TLS私钥管理 | 列表+新增入口 | 表格渲染；含私钥/证书字样 | E2E |
| TC-SECPOLICY-001 | 安全策略管理 | 表单字段完整性 | 含密码/策略；保存按钮存在 | E2E |

## 十、后续规划（三期）

- 金库审批流（treasury）：删除审批弹窗
- NSM 阻断规则深度业务流
- 性能/并发专项、兼容性矩阵（Edge/Firefox）

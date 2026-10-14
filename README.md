# SCMP Web 端自动化测试项目

数据流转安全管理平台（https://172.16.5.94/user/login）的 Web 端自动化测试工程。

## 快速开始

```bash
# 1. 安装依赖（首次）
npm install
npx playwright install chromium
pip3 install requests pytest

# 2. 运行 E2E 测试
npm run test:e2e

# 3. 运行 API 测试（勿与 E2E 并行——单点登录互踢）
python3 -m pytest tests/api -v --junitxml=test-results/api_results.xml

# 4. 生成 Markdown 测试报告
python3 scripts/generate_report.py
# → docs/test_report.md

# 5. 查看 Playwright HTML 交互报告
npx playwright show-report
```

## 目录结构

| 路径 | 说明 |
| --- | --- |
| [docs/test_plan.md](docs/test_plan.md) | 测试方案（策略、选型、范围、风险） |
| [docs/test_cases.md](docs/test_cases.md) | 测试用例清单（TC-* 编号） |
| [docs/test_report.md](docs/test_report.md) | 自动生成的测试报告 |
| [tests/e2e/](tests/e2e/) | Playwright E2E 用例（login / navigation / user_manage / interface_ledger / risk_alert / system_manage / session_security） |
| [tests/api/](tests/api/) | pytest API 用例（认证 + 核心业务接口） |
| [scripts/generate_report.py](scripts/generate_report.py) | 汇总 JUnit XML → Markdown 报告 |
| [.claude/skills/scmp-autotest/](.claude/skills/scmp-autotest/) | Claude Code 技能：系统关键事实与操作手册 |

## 覆盖模块

- **P0**：系统登录、会话与安全（单点互踢/Token/登出）、主界面导航
- **P1**：账号管理（增删改查）、接口台账管理、异常调用监测及告警
- **P2**：系统管理中心（角色/组织/用户组/菜单/字典/日志/公告）

## 重要约束

1. **单点登录**：admin 账号同一时间只能有一个活跃会话。E2E 串行执行（workers=1），API 与 E2E 顺序执行。
2. **自签名证书**：所有 HTTP 客户端需跳过证书校验（框架已配置）。
3. **RSA 加密登录**：用户名和密码都必须用动态公钥加密（详见 skill 文档）。
4. **测试数据**：写操作用例产生 `autotest_*` 前缀账号，请定期在系统中清理。

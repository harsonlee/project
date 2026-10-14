#!/usr/bin/env python3
"""
汇总 Playwright (JUnit XML) 与 pytest 结果，生成 Markdown 测试报告。

用法:
    python3 scripts/generate_report.py [--e2e-xml test-results/results.xml] [--out docs/test_report.md]
"""
import argparse
import glob
import os
import sys
import xml.etree.ElementTree as ET
from datetime import datetime
from collections import OrderedDict


def parse_junit(path):
    """解析 Playwright JUnit XML → 用例列表"""
    cases = []
    if not os.path.exists(path):
        return cases
    tree = ET.parse(path)
    root = tree.getroot()
    suites = root.findall(".//testsuite") or ([root] if root.tag == "testsuite" else [])
    for suite in suites:
        for case in suite.findall("testcase"):
            name = case.get("name", "")
            classname = case.get("classname", "")
            time_s = float(case.get("time", "0") or 0)
            status = "passed"
            detail = ""
            failure = case.find("failure")
            error = case.find("error")
            skipped = case.find("skipped")
            if failure is not None or error is not None:
                node = failure if failure is not None else error
                status = "failed"
                detail = (node.get("message") or "") + "\n" + (node.text or "")[:500]
            elif skipped is not None:
                status = "skipped"
                detail = skipped.get("message") or ""
            cases.append({
                "source": "E2E",
                "module": (classname.rsplit(".", 1)[0].split("/")[-1] if "." in classname else classname).replace(".spec", ""),
                "name": name,
                "status": status,
                "duration": time_s,
                "detail": detail.strip(),
            })
    return cases


def parse_pytest_xml(path):
    """解析 pytest --junitxml 输出（若存在）"""
    cases = []
    if not os.path.exists(path):
        return cases
    try:
        tree = ET.parse(path)
    except ET.ParseError:
        return cases
    root = tree.getroot()
    for suite in root.findall(".//testsuite"):
        for case in suite.findall("testcase"):
            name = case.get("name", "")
            classname = case.get("classname", "")
            time_s = float(case.get("time", "0") or 0)
            status = "passed"
            detail = ""
            f = case.find("failure") or case.find("error")
            s = case.find("skipped")
            if f is not None:
                status = "failed"
                detail = (f.get("message") or "") + "\n" + (f.text or "")[:500]
            elif s is not None:
                status = "skipped"
            module = classname.split(".")[-1].replace("test_", "").replace(".py", "")
            cases.append({
                "source": "API",
                "module": module,
                "name": name,
                "status": status,
                "duration": time_s,
                "detail": detail.strip(),
            })
    return cases


STATUS_ICON = {"passed": "✅", "failed": "❌", "skipped": "⏭️"}


def build_report(e2e_cases, api_cases, meta):
    all_cases = e2e_cases + api_cases
    total = len(all_cases)
    passed = sum(1 for c in all_cases if c["status"] == "passed")
    failed = sum(1 for c in all_cases if c["status"] == "failed")
    skipped = sum(1 for c in all_cases if c["status"] == "skipped")
    duration = sum(c["duration"] for c in all_cases)
    rate = (passed / total * 100) if total else 0.0

    lines = []
    lines.append("# 数据流转安全管理平台 — Web 端自动化测试报告")
    lines.append("")
    lines.append(f"- **被测系统**: {meta['system']}")
    lines.append(f"- **环境地址**: {meta['url']}")
    lines.append(f"- **测试账号**: {meta['account']}")
    lines.append(f"- **报告生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append(f"- **执行方式**: Playwright E2E (Chromium) + pytest API")
    lines.append("")
    lines.append("## 一、总体结果")
    lines.append("")
    lines.append("| 指标 | 数值 |")
    lines.append("| --- | --- |")
    lines.append(f"| 用例总数 | {total} |")
    lines.append(f"| 通过 | {passed} |")
    lines.append(f"| 失败 | {failed} |")
    lines.append(f"| 跳过 | {skipped} |")
    lines.append(f"| 通过率 | {rate:.1f}% |")
    lines.append(f"| 总耗时 | {duration:.1f}s |")
    lines.append("")

    # 按来源+模块分组
    grouped = OrderedDict()
    for c in all_cases:
        key = f"{c['source']} · {c['module']}"
        grouped.setdefault(key, []).append(c)

    lines.append("## 二、分模块结果")
    lines.append("")
    lines.append("| 模块 | 总数 | 通过 | 失败 | 跳过 | 通过率 |")
    lines.append("| --- | --- | --- | --- | --- | --- |")
    for mod, cs in grouped.items():
        p = sum(1 for c in cs if c["status"] == "passed")
        f = sum(1 for c in cs if c["status"] == "failed")
        s = sum(1 for c in cs if c["status"] == "skipped")
        r = (p / len(cs) * 100) if cs else 0
        lines.append(f"| {mod} | {len(cs)} | {p} | {f} | {s} | {r:.0f}% |")
    lines.append("")

    lines.append("## 三、用例明细")
    lines.append("")
    for mod, cs in grouped.items():
        lines.append(f"### {mod}")
        lines.append("")
        lines.append("| 状态 | 用例 | 耗时(s) | 备注 |")
        lines.append("| --- | --- | --- | --- |")
        for c in cs:
            icon = STATUS_ICON.get(c["status"], "?")
            note = c["detail"].split("\n")[0][:80] if c["detail"] else ""
            lines.append(f"| {icon} {c['status']} | {c['name']} | {c['duration']:.1f} | {note} |")
        lines.append("")

    if failed:
        lines.append("## 四、失败用例详情")
        lines.append("")
        for c in all_cases:
            if c["status"] != "failed":
                continue
            lines.append(f"### ❌ [{c['source']}] {c['name']}")
            lines.append("")
            lines.append("```")
            lines.append(c["detail"][:1500])
            lines.append("```")
            lines.append("")

    lines.append("## 五、已知问题与建议")
    lines.append("")
    lines.append(meta["known_issues"])
    lines.append("")
    lines.append("---")
    lines.append("*本报告由 `scripts/generate_report.py` 自动生成。*")
    return "\n".join(lines)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--e2e-xml", default="test-results/results.xml")
    ap.add_argument("--api-xml", default="test-results/api_results.xml")
    ap.add_argument("--out", default="docs/test_report.md")
    args = ap.parse_args()

    e2e_cases = parse_junit(args.e2e_xml)
    api_cases = parse_pytest_xml(args.api_xml)

    known_issues = (
        "| # | 问题 | 严重级 | 说明 |\n"
        "| --- | --- | --- | --- |\n"
        "| 1 | 登出接口 `/scmp-manage/manager/logout` API 直连返回 HTTP 500 | 中 | API 直连恒报\"系统错误\"，但 UI 流程下 logout 返回 200 并跳转登录页，token 实际已失效。建议后端统一该接口异常处理。 |\n"
        "| 2 | 登录失败时响应体回显用户名/显示名 | 低 | 错误响应 `data` 中含 `_username`/`username`，可被用于枚举有效账号，建议统一为泛化提示。 |\n"
        "| 3 | 主账号单点登录互踢 | 提示 | 同账号新登录会使旧会话立即下线（401），自动化多浏览器场景需串行控制。 |\n"
        "| 4 | RSA 动态公钥每次登录变化 | 提示 | 前端每次登录前调用 `get_key` 获取新公钥，属正常安全设计；测试框架已适配。 |\n"
        "| 5 | 资源类型管理 `/system/assetTypeManage` 重定向首页 | 中 | 该路由无独立功能页（实测重定向/无主体渲染），疑似菜单配置或前端路由缺陷，已在 TC-SUB-042 标注。 |\n"
        "| 6 | 人员新增表单必填项未标红星且空提交仅内联提示 | 低 | 全部必填项（名称/帐号/密码/手机/邮箱/组织/生效时间/描述）DOM 上 `required=false`，依赖提交时校验；建议前端补充必填标识以提升可用性。 |"
    )

    meta = {
        "system": "数据流转安全管理平台",
        "url": "https://172.16.5.94/user/login",
        "account": "admin",
        "known_issues": known_issues,
    }

    report = build_report(e2e_cases, api_cases, meta)
    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        f.write(report)
    print(f"报告已生成: {args.out}")
    print(f"E2E 用例: {len(e2e_cases)} 条 | API 用例: {len(api_cases)} 条")


if __name__ == "__main__":
    main()

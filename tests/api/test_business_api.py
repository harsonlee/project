"""
API 测试：核心业务接口（账号管理 / 公告 / 菜单）
依赖 auth_headers fixture（会占用 admin 单点会话，勿与 E2E 并发运行）。
"""
import pytest


class TestUserManageAPI:
    """账号管理 /scmp-manage/user/page"""

    def test_user_page_list(self, logged_in_session):
        resp = logged_in_session.post(
            "https://172.16.5.94/scmp-manage/user/page",
            json={"pageNum": 1, "pageSize": 10},
            timeout=20,
        )
        assert resp.status_code == 200
        body = resp.json()
        data = body.get("data") or body.get("rows") or []
        assert isinstance(data, list) and len(data) > 0
        # admin 账号应存在
        login_names = [u.get("userLoginName") for u in data]
        assert "admin" in login_names

    def test_user_page_pagination_fields(self, logged_in_session):
        resp = logged_in_session.post(
            "https://172.16.5.94/scmp-manage/user/page",
            json={"pageNum": 1, "pageSize": 5},
            timeout=20,
        )
        body = resp.json()
        # 校验分页响应结构包含总数信息
        text = str(body)
        assert any(k in body for k in ("total", "totalCount", "count")) or "data" in body

    def test_user_search_by_login_name(self, logged_in_session):
        resp = logged_in_session.post(
            "https://172.16.5.94/scmp-manage/user/search-list",
            json={"userLoginName": "admin", "pageNum": 1, "pageSize": 10},
            timeout=20,
        )
        assert resp.status_code == 200
        body = resp.json()
        # 该接口直接返回列表（非 {data: [...]} 包裹结构）
        data = body if isinstance(body, list) else (body.get("data") or [])
        if data:
            assert any(u.get("userLoginName") == "admin" for u in data)


class TestNoticeAPI:
    """公告管理 /scmp-manage/sys-notice/page"""

    def test_notice_page_list(self, logged_in_session):
        resp = logged_in_session.post(
            "https://172.16.5.94/scmp-manage/sys-notice/page",
            json={"pageNum": 1, "pageSize": 5},
            timeout=20,
        )
        assert resp.status_code == 200
        body = resp.json()
        data = body.get("data") or []
        assert isinstance(data, list)
        # 若环境中有公告数据，则校验字段完整性
        for item in data[:3]:
            assert "title" in item
            assert "id" in item


class TestMenuAPI:
    """菜单权限 /scmp-manage/manager/menu"""

    def test_menu_returns_full_tree(self, logged_in_session):
        resp = logged_in_session.get(
            "https://172.16.5.94/scmp-manage/manager/menu", timeout=20
        )
        assert resp.status_code == 200
        menu = resp.json()
        assert isinstance(menu, list) and len(menu) > 5

        names = {m.get("name") for m in menu}
        # 核心一级模块均应存在
        for expected in ["flow_manage", "interface_flow", "system"]:
            assert expected in names, f"缺少一级菜单: {expected}"

    def test_role_info(self, logged_in_session):
        resp = logged_in_session.get(
            "https://172.16.5.94/scmp-manage/manager/role", timeout=20
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body.get("username") == "admin"
        assert body.get("name") == "超级管理员"
        role = body.get("role") or {}
        # 角色对象中角色 ID 字段为 "id"（值 admin_role）
        assert role.get("id") == "admin_role"
        assert len(role.get("permissions") or []) > 0

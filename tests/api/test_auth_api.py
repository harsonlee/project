"""
API 测试：认证与会话（登录 / 登出 / Token 校验）
对应 E2E 模块"系统登录"与"会话与安全"的服务端验证。
"""
import base64
import json
import subprocess

import pytest
import requests

BASE_URL = "https://172.16.5.94"


def _no_verify_session() -> requests.Session:
    s = requests.Session()
    s.verify = False
    return s


def _get_pub_pem(session: requests.Session) -> str:
    resp = session.get(f"{BASE_URL}/scmp-manage/manager/get_key", timeout=15)
    resp.raise_for_status()
    data = resp.json()["data"]
    lines = [data[i:i + 64] for i in range(0, len(data), 64)]
    return "-----BEGIN PUBLIC KEY-----\n" + "\n".join(lines) + "\n-----END PUBLIC KEY-----"


def _enc(pem: str, plaintext: str) -> str:
    with open("/tmp/_autotest_pub.pem", "w") as f:
        f.write(pem)
    r = subprocess.run(
        ["bash", "-lc", f'printf "%s" {json.dumps(plaintext)} | openssl pkeyutl -encrypt -pubin -inkey /tmp/_autotest_pub.pem'],
        capture_output=True,
    )
    assert r.returncode == 0, r.stderr.decode()
    return base64.b64encode(r.stdout).decode()


@pytest.fixture(scope="module")
def raw_session():
    s = _no_verify_session()
    yield s
    s.close()


class TestLoginAPI:
    """登录接口 /scmp-manage/manager/login"""

    def test_login_success(self, raw_session):
        pem = _get_pub_pem(raw_session)
        payload = {"username": _enc(pem, "admin"), "password": _enc(pem, "123456")}
        resp = raw_session.post(f"{BASE_URL}/scmp-manage/manager/login", json=payload, timeout=20)
        body = resp.json()
        assert resp.status_code == 200
        assert body["success"] is True
        assert body["code"] == 1
        assert body["token"], "应返回有效 token"
        assert body["data"]["_username"] == "admin"
        assert body["data"]["username"] == "超级管理员"

    def test_login_wrong_password(self, raw_session):
        pem = _get_pub_pem(raw_session)
        payload = {"username": _enc(pem, "admin"), "password": _enc(pem, "wrong_pass_123")}
        resp = raw_session.post(f"{BASE_URL}/scmp-manage/manager/login", json=payload, timeout=20)
        body = resp.json()
        assert body["success"] is False
        assert "登录失败" in body["message"]
        assert body["token"] is None

    def test_login_unknown_user(self, raw_session):
        pem = _get_pub_pem(raw_session)
        payload = {"username": _enc(pem, "no_such_user_xyz"), "password": _enc(pem, "whatever")}
        resp = raw_session.post(f"{BASE_URL}/scmp-manage/manager/login", json=payload, timeout=20)
        body = resp.json()
        assert body["success"] is False
        assert body["token"] is None

    def test_login_plain_password_rejected(self, raw_session):
        """密码未加密（明文）时应登录失败——验证 RSA 加密为强制要求"""
        pem = _get_pub_pem(raw_session)
        payload = {"username": _enc(pem, "admin"), "password": "123456"}
        resp = raw_session.post(f"{BASE_URL}/scmp-manage/manager/login", json=payload, timeout=20)
        body = resp.json()
        assert body["success"] is False

    def test_login_empty_username(self, raw_session):
        """openssl 无法加密空字符串（PKCS1v15 要求非空输入），
        此处直接以空串提交，验证服务端对缺失/空用户名的处理"""
        pem = _get_pub_pem(raw_session)
        payload = {"username": "", "password": _enc(pem, "123456")}
        resp = raw_session.post(f"{BASE_URL}/scmp-manage/manager/login", json=payload, timeout=20)
        body = resp.json()
        assert body["success"] is False


class TestSessionAPI:
    """Token 有效性校验"""

    @pytest.fixture(scope="class")
    def valid_token(self, raw_session):
        pem = _get_pub_pem(raw_session)
        payload = {"username": _enc(pem, "admin"), "password": _enc(pem, "123456")}
        body = raw_session.post(f"{BASE_URL}/scmp-manage/manager/login", json=payload, timeout=20).json()
        assert body["success"] is True
        return body["token"]

    def test_valid_token_access_menu(self, raw_session, valid_token):
        resp = raw_session.get(
            f"{BASE_URL}/scmp-manage/manager/menu",
            headers={"Authorization": f"JWT {valid_token}"},
            timeout=15,
        )
        assert resp.status_code == 200
        menu = resp.json()
        assert isinstance(menu, list) and len(menu) > 0

    def test_invalid_token_rejected(self, raw_session):
        resp = raw_session.get(
            f"{BASE_URL}/scmp-manage/manager/menu",
            headers={"Authorization": "JWT INVALID_TOKEN_000000"},
            timeout=15,
        )
        assert resp.status_code == 401

    def test_missing_token_rejected(self, raw_session):
        resp = raw_session.get(f"{BASE_URL}/scmp-manage/manager/menu", timeout=15)
        assert resp.status_code == 401

    def test_get_login_config_public(self, raw_session):
        """登录配置为公开接口，无需鉴权"""
        resp = raw_session.get(f"{BASE_URL}/scmp-manage/manager/get_login_config", timeout=15)
        assert resp.status_code == 200
        body = resp.json()
        assert "needCaptcha" in body
        assert body["needCaptcha"] is False

"""
API 测试公共 fixture
- 自签名证书跳过校验
- RSA 动态公钥加密登录（与前端 JSEncrypt 行为一致：PKCS1v15 + Base64）
- 提供已认证 session（带 JWT Authorization header）
"""
import base64
import json
import subprocess

import pytest
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

BASE_URL = "https://172.16.5.94"
USERNAME = "admin"
PASSWORD = "123456"


def _make_session() -> requests.Session:
    s = requests.Session()
    s.verify = False  # 内网自签名证书
    retry = Retry(total=2, backoff_factor=0.5, status_forcelist=[502, 503, 504])
    s.mount("https://", HTTPAdapter(max_retries=retry))
    return s


def _fetch_public_key(session: requests.Session) -> str:
    """获取动态 RSA 公钥（PEM 格式）"""
    resp = session.get(f"{BASE_URL}/scmp-manage/manager/get_key", timeout=15)
    resp.raise_for_status()
    data = resp.json()["data"]  # base64 DER
    der_b64_lines = [data[i:i + 64] for i in range(0, len(data), 64)]
    pem = "-----BEGIN PUBLIC KEY-----\n" + "\n".join(der_b64_lines) + "\n-----END PUBLIC KEY-----"
    return pem


def _rsa_encrypt(plaintext: str) -> str:
    """RSA PKCS1v15 加密并返回 Base64（等价于前端 JSEncrypt.encrypt）。公钥需已写入 /tmp/_autotest_pub.pem"""
    result = subprocess.run(
        ["bash", "-lc", f'printf "%s" {json.dumps(plaintext)} | openssl pkeyutl -encrypt -pubin -inkey /tmp/_autotest_pub.pem'],
        capture_output=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"openssl encrypt failed: {result.stderr.decode()}")
    return base64.b64encode(result.stdout).decode()


@pytest.fixture(scope="session")
def api_session():
    """未认证的 HTTP session（跳过证书校验）"""
    session = _make_session()
    yield session
    session.close()


@pytest.fixture(scope="session")
def auth_headers(api_session):
    """
    登录并返回带 JWT 的 headers。
    注意：系统为主账号单点登录，本 fixture 会占用 admin 会话，
    与 E2E 浏览器测试不可同时运行。
    """
    # 先写公钥到临时文件供 openssl 使用
    pem = _fetch_public_key(api_session)
    with open("/tmp/_autotest_pub.pem", "w") as f:
        f.write(pem)

    payload = {
        "username": _rsa_encrypt(USERNAME),
        "password": _rsa_encrypt(PASSWORD),
    }
    resp = api_session.post(
        f"{BASE_URL}/scmp-manage/manager/login",
        json=payload,
        headers={"Content-Type": "application/json"},
        timeout=20,
    )
    body = resp.json()
    assert body.get("success") is True, f"登录失败: {body.get('message')}"
    token = body["token"]
    return {
        "Authorization": f"JWT {token}",
        "Content-Type": "application/json",
    }


@pytest.fixture(scope="session")
def logged_in_session(api_session, auth_headers):
    """已认证的 HTTP session"""
    api_session.headers.update(auth_headers)
    yield api_session

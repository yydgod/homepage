#!/usr/bin/env python3
"""
Home Assistant CORS 代理
=======================
解决起始页（file:// 打开）访问 HA 时的浏览器跨域 / Private Network Access 拦截。

用法：
    1. 复制 data/ha-proxy-config.example.json 为 data/ha-proxy-config.json
       并修改 target 为你的 HA 地址（本地配置存在 data/ 目录，已加入 .gitignore）
    2. 运行：python3 tools/ha-cors-proxy.py
    3. 起始页 HA 插件中地址填：http://localhost:8899

原理：浏览器请求 localhost:8899（local→local 不受 PNA 限制），
      本代理转发到局域网 HA 并自动补全 CORS 响应头。
"""
import json
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

# 默认值（data/ha-proxy-config.json 存在时优先读取）
TARGET = "http://192.168.1.10:8123"
PORT = 8899

_BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_DATA_DIR = os.path.join(_BASE, "data")
_CONFIG_PATH = os.path.join(_DATA_DIR, "ha-proxy-config.json")
_EXAMPLE_PATH = os.path.join(_DATA_DIR, "ha-proxy-config.example.json")


def load_local_config():
    """从 data/ha-proxy-config.json 读取本地配置（该文件不入库，持久化本地修改）"""
    global TARGET, PORT
    if os.path.isfile(_CONFIG_PATH):
        try:
            with open(_CONFIG_PATH, "r", encoding="utf-8") as f:
                conf = json.load(f)
            TARGET = str(conf.get("target", TARGET)).rstrip("/")
            PORT = int(conf.get("port", PORT))
            print(f"已读取本地配置 {_CONFIG_PATH}：{TARGET} 端口 {PORT}")
            return True
        except (json.JSONDecodeError, ValueError) as e:
            print(f"本地配置解析失败：{e}，使用默认值")
    elif os.path.isfile(_EXAMPLE_PATH):
        print(f"未找到 {_CONFIG_PATH}，可复制示例配置：")
        print(f"  cp {_EXAMPLE_PATH} {_CONFIG_PATH}")
        print(f"然后修改其中的 target 为你的 HA 地址")
    return False

class ProxyHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def _cors_headers(self, origin):
        self.send_header("Access-Control-Allow-Origin", origin or "null")
        self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type, X-HA-Access")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Max-Age", "86400")

    def do_OPTIONS(self):
        origin = self.headers.get("Origin", "null")
        self.send_response(204)
        self._cors_headers(origin)
        self.end_headers()

    def _forward(self, method):
        origin = self.headers.get("Origin", "null")
        headers = {}
        for key in ("Authorization", "Content-Type", "X-HA-Access"):
            value = self.headers.get(key)
            if value:
                headers[key] = value
        length = int(self.headers.get("Content-Length", 0) or 0)
        body = self.rfile.read(length) if length else None
        url = TARGET.rstrip("/") + self.path
        try:
            req = Request(url, data=body, headers=headers, method=method)
            res = urlopen(req, timeout=30)
            status, payload = res.status, res.read()
            ctype = res.headers.get("Content-Type", "application/json")
        except HTTPError as e:
            status, payload = e.code, e.read()
            ctype = e.headers.get("Content-Type", "application/json")
        except URLError as e:
            status, payload = 502, f"无法连接 HA：{e.reason}".encode()
            ctype = "text/plain"
        self.send_response(status)
        self._cors_headers(origin)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    do_GET = lambda self: self._forward("GET")
    do_POST = lambda self: self._forward("POST")
    do_PUT = lambda self: self._forward("PUT")
    do_DELETE = lambda self: self._forward("DELETE")

    def log_message(self, fmt, *args):
        sys.stderr.write("[proxy] %s\n" % (fmt % args))


if __name__ == "__main__":
    load_local_config()
    server = ThreadingHTTPServer(("0.0.0.0", PORT), ProxyHandler)
    print(f"HA CORS 代理已启动：http://localhost:{PORT} → {TARGET}")
    print("起始页 HA 插件中「HA 地址」请填写：http://localhost:%d" % PORT)
    print("Ctrl+C 停止")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n已停止")

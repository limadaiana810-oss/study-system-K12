#!/bin/bash
# DeliClaw Demo 一键启动脚本 — 双击即可运行
# 行为约定：
# - 自动打开公网演示地址
# - 当前终端窗口保持运行
# - 关闭当前窗口后，Next dev 和 Cloudflare Tunnel 一起停止

set -u

# 找到脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR/deliclaw-demo"

# 常见 Node.js 安装路径
NPM_PATHS=(
  "/opt/homebrew/opt/node@24/bin/npm"
  "/opt/homebrew/bin/npm"
  "/usr/local/bin/npm"
  "$(which npm 2>/dev/null)"
)

# 常见 cloudflared 安装路径（Cloudflare Tunnel）
CLOUDFLARED_PATHS=(
  "/opt/homebrew/bin/cloudflared"
  "/usr/local/bin/cloudflared"
  "$(which cloudflared 2>/dev/null)"
)

NPM_CMD=""
for p in "${NPM_PATHS[@]}"; do
  if [ -x "$p" ]; then
    NPM_CMD="$p"
    break
  fi
done

CLOUDFLARED_CMD=""
for p in "${CLOUDFLARED_PATHS[@]}"; do
  if [ -x "$p" ]; then
    CLOUDFLARED_CMD="$p"
    break
  fi
done

echo ""
echo "🚀 DeliClaw Demo 启动中..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -z "$NPM_CMD" ]; then
  echo "❌ 未检测到 Node.js / npm"
  echo "   请访问 https://nodejs.org 安装后重试"
  read -p "按任意键关闭..."
  exit 1
fi

if [ -z "$CLOUDFLARED_CMD" ]; then
  echo "❌ 未检测到 cloudflared（用于公网访问）"
  echo "   安装方式："
  echo "   - Homebrew:  brew install cloudflared"
  echo "   - 或参考： https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
  read -p "安装完成后按任意键关闭..."
  exit 1
fi

# 检查 API Key
ENV_FILE="$PROJECT_DIR/.env.local"
if [ ! -f "$ENV_FILE" ]; then
  echo "⚠️  未找到 $ENV_FILE"
  echo "   请复制 .env.example 为 .env.local，并填入 OPENROUTER_API_KEY"
  read -p "按任意键关闭..."
  exit 1
fi

if ! grep -q "^OPENROUTER_API_KEY=sk-or-" "$ENV_FILE" 2>/dev/null; then
  echo "⚠️  请先配置 OpenRouter API Key："
  echo "   编辑文件：$ENV_FILE"
  echo "   将 OPENROUTER_API_KEY= 后面替换为你的真实 Key"
  read -p "配置好后按任意键继续..."
fi

# 读取（可选）访问口令：DEMO_ACCESS_TOKEN
DEMO_TOKEN="$(grep -E '^DEMO_ACCESS_TOKEN=' "$ENV_FILE" 2>/dev/null | tail -n 1 | cut -d '=' -f2- | tr -d '\r' | tr -d ' ')"

cd "$PROJECT_DIR"

# 首次运行安装依赖
if [ ! -f "node_modules/.bin/next" ] && [ ! -f "node_modules/@next/swc-darwin-arm64/next-swc.darwin-arm64.node" ]; then
  echo "📦 首次运行，安装依赖（约1-2分钟）..."
  "$NPM_CMD" install --silent
  echo "✅ 依赖安装完成"
fi

PID_DEV_FILE="$SCRIPT_DIR/.deliclaw-dev.pid"
PID_TUNNEL_FILE="$SCRIPT_DIR/.deliclaw-tunnel.pid"
LOG_DEV_FILE="$SCRIPT_DIR/.deliclaw-dev.log"
LOG_TUNNEL_FILE="$SCRIPT_DIR/.deliclaw-tunnel.log"

DEV_PID=""
TUNNEL_PID=""

cleanup_recorded_process() {
  local pid_file="$1"
  local expected="$2"
  local pid=""
  local cmd=""

  if [ ! -f "$pid_file" ]; then
    return
  fi

  pid="$(tr -d '[:space:]' < "$pid_file" 2>/dev/null)"
  if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
    cmd="$(ps -p "$pid" -o command= 2>/dev/null || true)"
    if echo "$cmd" | grep -Fq "$expected"; then
      echo "ℹ️  清理上次遗留进程：$expected"
      kill "$pid" 2>/dev/null || true
      sleep 1
    fi
  fi

  rm -f "$pid_file"
}

cleanup_project_port_processes() {
  local port=3000
  local pids=""
  local pid=""
  local cwd=""

  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  for pid in $pids; do
    cwd="$(lsof -a -p "$pid" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p' | tail -n 1)"

    if [ "$cwd" = "$PROJECT_DIR" ]; then
      echo "ℹ️  清理当前项目占用 $port 端口的旧服务（PID $pid）"
      kill "$pid" 2>/dev/null || true
      for _ in {1..10}; do
        if ! kill -0 "$pid" 2>/dev/null; then
          break
        fi
        sleep 0.3
      done
    elif [ -n "$pid" ]; then
      echo "❌ 端口 $port 已被其他进程占用（PID $pid）"
      echo "   请先关闭该进程后重试。"
      exit 1
    fi
  done
}

wait_for_local_port_3000() {
  for _ in {1..30}; do
    if ! kill -0 "$DEV_PID" 2>/dev/null; then
      echo "❌ 本地服务启动失败，请查看：$LOG_DEV_FILE"
      exit 1
    fi

    if grep -q "Another next dev server is already running" "$LOG_DEV_FILE" 2>/dev/null; then
      echo "❌ 检测到已有 Next dev server，请查看：$LOG_DEV_FILE"
      exit 1
    fi

    if grep -q "Port 3000 is in use" "$LOG_DEV_FILE" 2>/dev/null; then
      echo "❌ 端口 3000 仍被占用，请查看：$LOG_DEV_FILE"
      exit 1
    fi

    if grep -q "http://localhost:3000" "$LOG_DEV_FILE" 2>/dev/null && grep -q "Ready" "$LOG_DEV_FILE" 2>/dev/null; then
      return
    fi

    sleep 1
  done

  echo "❌ 本地服务未能在 30 秒内监听 http://localhost:3000，请查看：$LOG_DEV_FILE"
  exit 1
}

cleanup() {
  local stopped=0

  trap - EXIT HUP INT TERM

  if [ -n "${TUNNEL_PID:-}" ] && kill -0 "$TUNNEL_PID" 2>/dev/null; then
    stopped=1
    kill "$TUNNEL_PID" 2>/dev/null || true
  fi

  if [ -n "${DEV_PID:-}" ] && kill -0 "$DEV_PID" 2>/dev/null; then
    stopped=1
    kill "$DEV_PID" 2>/dev/null || true
  fi

  if [ -n "${TUNNEL_PID:-}" ]; then
    wait "$TUNNEL_PID" 2>/dev/null || true
  fi
  if [ -n "${DEV_PID:-}" ]; then
    wait "$DEV_PID" 2>/dev/null || true
  fi

  rm -f "$PID_DEV_FILE" "$PID_TUNNEL_FILE"

  if [ "$stopped" -eq 1 ]; then
    echo ""
    echo "🛑 演示服务已停止"
  fi
}

trap cleanup EXIT HUP INT TERM

cleanup_recorded_process "$PID_DEV_FILE" "next dev"
cleanup_recorded_process "$PID_TUNNEL_FILE" "cloudflared tunnel"
cleanup_project_port_processes

: > "$LOG_DEV_FILE"
: > "$LOG_TUNNEL_FILE"

echo "🌐 启动本地服务（关闭此窗口将自动停止）..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1) 启动 Next dev（绑定到当前终端生命周期）
"$NPM_CMD" run dev > "$LOG_DEV_FILE" 2>&1 &
DEV_PID=$!
echo "$DEV_PID" > "$PID_DEV_FILE"

# 等待 dev server 确认监听 3000，避免 Next 自动切到 3001 后 tunnel 指错端口
wait_for_local_port_3000

# 2) 启动 Cloudflare Tunnel（绑定到当前终端生命周期）
"$CLOUDFLARED_CMD" tunnel --url http://localhost:3000 --no-autoupdate > "$LOG_TUNNEL_FILE" 2>&1 &
TUNNEL_PID=$!
echo "$TUNNEL_PID" > "$PID_TUNNEL_FILE"

# 3) 从日志里解析公网域名
PUBLIC_URL=""
for i in {1..25}; do
  if ! kill -0 "$DEV_PID" 2>/dev/null; then
    echo "❌ 本地服务启动失败，请查看：$LOG_DEV_FILE"
    exit 1
  fi
  if ! kill -0 "$TUNNEL_PID" 2>/dev/null; then
    echo "❌ Cloudflare Tunnel 启动失败，请查看：$LOG_TUNNEL_FILE"
    exit 1
  fi
  PUBLIC_URL="$(grep -oE 'https://[-0-9a-z]+\.trycloudflare\.com' "$LOG_TUNNEL_FILE" 2>/dev/null | tail -n 1)"
  if [ -n "$PUBLIC_URL" ]; then break; fi
  sleep 1
done

OPEN_URL=""
if [ -n "$PUBLIC_URL" ]; then
  if [ -n "$DEMO_TOKEN" ]; then
    OPEN_URL="$PUBLIC_URL/?token=$DEMO_TOKEN"
  else
    OPEN_URL="$PUBLIC_URL"
  fi
else
  OPEN_URL="http://localhost:3000"
fi

echo ""
echo "✅ 服务已启动（请保持此窗口开启）"
echo "   本地地址：http://localhost:3000"
if [ -n "$PUBLIC_URL" ]; then
  echo "   公网地址：$PUBLIC_URL"
  if [ -n "$DEMO_TOKEN" ] && [ "$DEMO_TOKEN" != "change-me" ]; then
    echo "   （已启用口令）访问地址：$OPEN_URL"
  elif [ -n "$DEMO_TOKEN" ] && [ "$DEMO_TOKEN" = "change-me" ]; then
    echo "   ⚠️  检测到 DEMO_ACCESS_TOKEN=change-me（建议改成自定义口令）"
    echo "   访问示例：$OPEN_URL"
  else
    echo "   ⚠️  未启用口令保护（建议在 .env.local 设置 DEMO_ACCESS_TOKEN）"
  fi
else
  echo "   ⚠️  未能解析到公网域名，请查看：$LOG_TUNNEL_FILE"
fi

echo ""
echo "🛑 关闭此窗口后，Next dev 和公网隧道会自动停止"
echo "   日志文件：$LOG_DEV_FILE"
echo "   Tunnel 日志：$LOG_TUNNEL_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 自动打开浏览器（优先公网地址）
open "$OPEN_URL" >/dev/null 2>&1 || true

# 保持窗口存活；任一服务退出后结束脚本并清理另一侧
while true; do
  if ! kill -0 "$DEV_PID" 2>/dev/null; then
    echo ""
    echo "❌ 本地服务已退出，请查看：$LOG_DEV_FILE"
    exit 1
  fi

  if ! kill -0 "$TUNNEL_PID" 2>/dev/null; then
    echo ""
    echo "❌ Cloudflare Tunnel 已退出，请查看：$LOG_TUNNEL_FILE"
    exit 1
  fi

  sleep 1
done

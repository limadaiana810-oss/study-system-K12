#!/bin/bash
# DeliClaw Demo 一键启动脚本 — 双击即可运行

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

# 若已在运行，先提示用户使用“停止演示.command”
if [ -f "$PID_DEV_FILE" ] || [ -f "$PID_TUNNEL_FILE" ]; then
  echo "⚠️  检测到可能已有演示进程在运行（存在 pid 文件）。"
  echo "   如需重启，请先双击运行：停止演示.command"
fi

echo "🌐 启动本地服务（后台运行）..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1) 启动 Next dev（后台运行：关闭终端不会中断）
nohup "$NPM_CMD" run dev > "$LOG_DEV_FILE" 2>&1 &
echo $! > "$PID_DEV_FILE"

# 给 dev server 一点启动时间
sleep 2

# 2) 启动 Cloudflare Tunnel（后台运行：关闭终端不会中断）
nohup "$CLOUDFLARED_CMD" tunnel --url http://localhost:3000 --no-autoupdate > "$LOG_TUNNEL_FILE" 2>&1 &
echo $! > "$PID_TUNNEL_FILE"

# 3) 从日志里解析公网域名
PUBLIC_URL=""
for i in {1..25}; do
  PUBLIC_URL="$(grep -oE 'https://[-0-9a-z]+\.trycloudflare\.com' "$LOG_TUNNEL_FILE" 2>/dev/null | tail -n 1)"
  if [ -n "$PUBLIC_URL" ]; then break; fi
  sleep 1
done

echo ""
echo "✅ 服务已在后台启动（关闭此窗口不会中断）"
echo "   本地地址：http://localhost:3000"
if [ -n "$PUBLIC_URL" ]; then
  echo "   公网地址：$PUBLIC_URL"
  if [ -n "$DEMO_TOKEN" ] && [ "$DEMO_TOKEN" != "change-me" ]; then
    echo "   （已启用口令）访问请加：$PUBLIC_URL/?token=$DEMO_TOKEN"
  elif [ -n "$DEMO_TOKEN" ] && [ "$DEMO_TOKEN" = "change-me" ]; then
    echo "   ⚠️  检测到 DEMO_ACCESS_TOKEN=change-me（建议改成自定义口令）"
    echo "   访问示例：$PUBLIC_URL/?token=$DEMO_TOKEN"
  else
    echo "   ⚠️  未启用口令保护（建议在 .env.local 设置 DEMO_ACCESS_TOKEN）"
  fi
else
  echo "   ⚠️  未能解析到公网域名，请查看：$LOG_TUNNEL_FILE"
fi

echo ""
echo "🛑 如需停止演示，请双击运行：停止演示.command"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 自动打开浏览器（优先公网地址）
if [ -n "$PUBLIC_URL" ]; then
  if [ -n "$DEMO_TOKEN" ]; then
    open "$PUBLIC_URL/?token=$DEMO_TOKEN" >/dev/null 2>&1
  else
    open "$PUBLIC_URL" >/dev/null 2>&1
  fi
else
  open "http://localhost:3000" >/dev/null 2>&1
fi

exit 0

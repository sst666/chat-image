# 部署文档（DEPLOYMENT）

## 1. 环境要求

- Node.js 18+
- npm 9+

## 2. 生产构建

```bash
npm install
npm run build
npm run start
```

默认启动端口：`3003`

## 3. 一键启动脚本

- Windows

```bat
start.bat
```

- macOS/Linux

```bash
./start.sh
```

脚本会自动检查 Node.js、安装依赖、构建并启动。

## 4. 反向代理（可选）

可使用 Nginx/Caddy 代理到 `http://127.0.0.1:3003`。

## 5. 持久化目录

部署时请保留以下目录写权限：

- `data/`
- `public/uploads/`
- `public/outputs/`

## 6. 配置 API

启动后进入 `/settings` 页面填写：

- Base URL（默认 `https://api.bywlai.cn`）
- API Key
- 提示词模型（默认 `gpt-5.4`）
- 图片模型（默认 `gpt-image-2-vip`）

## 7. 常见问题

- 出现 `Server Error` 且提示 chunk/module 缺失：  
  清理 `.next` 后重启。

```bash
rm -rf .next
npm run dev
```


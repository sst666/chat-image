# 加菲猫chat image

一个基于 Next.js 14 + TypeScript 的 AI 图片工作台，当前包含两条核心能力：

- 聊天：支持多轮对话、模型切换、消息编辑、重新发送、重新生成、上下文轮数限制
- 自定义生图：支持产品图/参考图上传、提示词整理、固定比例与自定义像素尺寸、失败后自动切换备用模型重试

## 当前版本亮点

- 聊天页支持浅色/深色主题同步
- 聊天设置支持自定义输出回复上限与最近保留轮数
- 生图设置支持主模型 + 备用模型队列
- 图片生成失败会按备用模型顺序自动重试
- 聊天记录与 API Key 默认保存在浏览器本地
- 生图任务与上传文件默认保存在服务器 `data/`（支持自动回退到系统临时目录）
- 已提供 Docker、Docker Compose、Nginx、systemd、PM2 部署方案

## 技术栈

- Next.js 14（App Router）
- React 18
- TypeScript
- Tailwind CSS
- 本地 JSON 持久化（`data/*.json`）

## 本地开发

```bash
npm install
npm run dev
```

默认监听：

- 地址：`0.0.0.0`
- 端口：`3018`

也可以通过环境变量覆盖：

```bash
PORT=3080 HOST=0.0.0.0 npm run dev
```

## 生产启动

```bash
npm install
npm run build
npm run start
```

## 健康检查

```bash
curl http://127.0.0.1:3018/api/health
```

返回示例：

```json
{
  "ok": true,
  "service": "chat-image",
  "timestamp": "2026-05-16T00:00:00.000Z"
}
```

## 目录结构

```text
app/
  api/                  后端接口
  cherrychat/           聊天模块
  custom-image/         自定义生图页面
  components/           全局组件
lib/                    AI 调用、默认配置、存储层
data/                   JSON 数据
public/uploads/         上传文件
public/outputs/         生成结果
deploy/                 Nginx / systemd 示例配置
docs/                   部署与二开文档
```

## 常用路径

- 首页聊天：`/`
- 自定义生图：`/custom-image`
- 历史记录：`/history`
- 主设置：`/settings`
- 健康检查：`/api/health`

## 数据目录说明

部署时请确保以下目录可写：

- `data/`
- （可选）`public/outputs/`

## 文档

- 二次开发文档：[docs/SECONDARY_DEVELOPMENT.md](/Users/sst/Documents/New%20project%202/docs/SECONDARY_DEVELOPMENT.md)
- 详细部署文档：[docs/DEPLOYMENT.md](/Users/sst/Documents/New%20project%202/docs/DEPLOYMENT.md)

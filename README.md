# taobao-image-Beta version

基于 Next.js 14 + TypeScript 的淘宝电商商品图 AI 生成平台。  
支持上传商品图、生成提示词、逐图生图、结果预览、模板管理、历史记录与设置管理。

## 主要功能

- 生图任务管理：支持多任务切换（左侧任务栏）
- 提示词生成：基于商品信息与词条模板自动生成
- 图片生成：支持单图生成与一键生成全部
- 任务控制：暂停、继续、取消（未发请求任务可取消）
- 模板体系：系统默认模板 + 自定义全套模板保存/复用
- 历史记录：任务下载与删除
- 设置页：API 配置、连接测试、生成/报错日志查看

## 技术栈

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- JSON 文件存储（`data/*.json`）

## 快速启动

```bash
npm install
npm run dev
```

默认端口：`3003`

Windows / macOS 一键启动：

- Windows: `start.bat`
- macOS/Linux: `./start.sh`

## 项目结构

```text
app/                页面与 API 路由
lib/                核心业务与存储逻辑
data/               JSON 数据文件（运行时）
public/uploads/     上传图片
public/outputs/     生成图片输出
```

## 相关文档

- 二开文档：`docs/SECONDARY_DEVELOPMENT.md`
- 部署文档：`docs/DEPLOYMENT.md`


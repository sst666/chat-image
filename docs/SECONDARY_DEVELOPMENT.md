# 加菲猫chat image 二次开发文档

这份文档面向后续接手项目的人，重点讲清楚：

1. 现在哪些模块最关键
2. 改功能时应该从哪里下手
3. 哪些地方容易改坏

---

## 1. 项目定位

当前项目不是单一聊天站，也不是单一生图站，而是两个能力并存：

- 聊天工作台：多轮对话、模型管理、消息编辑、重新发送、上下文裁剪
- 自定义生图工作台：上传产品图和参考图，整理提示词，提交生成任务，查看输出和历史

---

## 2. 核心目录

```text
app/
  api/                      后端接口
  cherrychat/               聊天模块
  custom-image/             自定义生图页面
  components/               全局通用组件
  history/                  历史记录
  settings/                 主设置页
lib/
  ai.ts                     AI 调用封装
  storage.ts                JSON 持久化
  defaults.ts               默认设置与默认模板
  types.ts                  生图模块类型
data/                       运行时数据
public/uploads/             上传素材
public/outputs/             生成结果
docs/                       项目文档
deploy/                     部署示例配置
```

---

## 3. 聊天模块结构

### 页面入口

- [app/page.tsx](/Users/sst/Documents/New%20project%202/app/page.tsx)

### 聊天主目录

- `app/cherrychat/CherryChatApp.tsx`
- `app/cherrychat/context/ChatContext.tsx`
- `app/cherrychat/components/*`

### 关键说明

#### `ChatContext.tsx`

负责：

- 对话列表状态
- 当前会话切换
- 消息发送
- 消息重生成
- 模型列表拉取
- 本地设置持久化

当前新增过的聊天配置项也在这里生效：

- `maxTokens`：输出回复上限
- `historyRoundsLimit`：最近保留轮数

#### `SettingsPanel.tsx`

这是聊天页右上角设置面板，不是主站 `/settings` 页面。  
聊天专属设置都放这里更合适。

#### `InputArea.tsx`

这里处理了几个比较容易踩坑的交互：

- Enter 发送、Shift+Enter 换行
- 中文输入法组合输入保护
- 消息发送后清空输入框
- 附件上传、图片预览、PDF/文档解析

如果后续再改输入逻辑，务必保留 `composition` 相关处理。

---

## 4. 自定义生图模块结构

### 页面入口

- [app/custom-image/page.tsx](/Users/sst/Documents/New%20project%202/app/custom-image/page.tsx)

### 后端接口

- [app/api/jobs/route.ts](/Users/sst/Documents/New%20project%202/app/api/jobs/route.ts)
- [app/api/upload/route.ts](/Users/sst/Documents/New%20project%202/app/api/upload/route.ts)
- [app/api/history/route.ts](/Users/sst/Documents/New%20project%202/app/api/history/route.ts)
- [app/api/download/route.ts](/Users/sst/Documents/New%20project%202/app/api/download/route.ts)

### 关键说明

#### 前端页面

`custom-image/page.tsx` 现在承载：

- 任务工作台切换
- 产品图/参考图上传
- 处理需求选择
- 默认提示词和自定义要求编辑
- 比例选择和自定义像素
- 结果预览与下载

#### 任务执行链路

1. 前端整理任务参数
2. `/api/jobs` 接收任务
3. `lib/ai.ts` 生成提示词和发起生图
4. `lib/storage.ts` 写回任务状态
5. 前端轮询或刷新读取结果

---

## 5. AI 调用层

核心文件：

- [lib/ai.ts](/Users/sst/Documents/New%20project%202/lib/ai.ts)

这里已经做了这些逻辑：

- 提示词生成调用 `/v1/chat/completions`
- 图片生成调用 `/v1/images/generations`
- 多参考图时自动走 multipart 上传
- 自定义生图任务会把多张参考图一起带上
- 生图失败后按主模型 + 备用模型顺序重试

如果后续接别的服务商，优先从这里抽象，不要先改页面层。

---

## 6. 设置与持久化

### 主设置

- [app/settings/page.tsx](/Users/sst/Documents/New%20project%202/app/settings/page.tsx)
- [app/api/settings/route.ts](/Users/sst/Documents/New%20project%202/app/api/settings/route.ts)

### 存储层

- [lib/storage.ts](/Users/sst/Documents/New%20project%202/lib/storage.ts)

当前特点：

- 使用本地 JSON 文件持久化
- 会自动创建 `data/`、`public/uploads/`、`public/outputs/`
- 设置会做 normalize，避免旧字段或缺失字段把页面搞挂

---

## 7. 数据文件说明

- `data/settings.json`：主设置
- `data/entries.json`：默认词条和模板类数据
- `data/jobs.json`：任务与图片状态
- `data/logs.json`：错误与生成日志

聊天记录目前在浏览器 `localStorage`：

- `bywlai-settings`
- `bywlai-conversations`
- `bywlai-current-conv-id`
- `bywlai-recent-models`
- `bywlai-favorite-models`

如果以后要做账号体系，聊天记录这里会是一个迁移点。

---

## 8. 推荐的改动流程

### 改聊天功能

通常顺序：

1. 改 `app/cherrychat/types.ts`
2. 改 `app/cherrychat/context/ChatContext.tsx`
3. 改 `app/cherrychat/components/*`
4. `npm run build`

### 改生图能力

通常顺序：

1. 改 `lib/types.ts`
2. 改 `lib/ai.ts`
3. 改 `app/api/jobs/route.ts`
4. 改 `app/custom-image/page.tsx`
5. `npm run build`

### 改主设置

通常顺序：

1. 改 `lib/defaults.ts`
2. 改 `lib/storage.ts`
3. 改 `app/api/settings/route.ts`
4. 改 `app/settings/page.tsx`
5. `npm run build`

---

## 9. 当前已经做过的定制点

为了后续不误删，这里单独记一下：

- 平台名称已改成 `加菲猫chat image`
- 顶部导航已去掉模板管理
- 聊天页已中文化
- 主题支持白天/黑夜切换
- 聊天设置支持输出回复上限和最近保留轮数
- 自定义生图支持手动像素尺寸
- 生图模型支持主模型 + 备用模型队列
- API Base URL 已固定为 `https://api.bywlai.cn`

---

## 10. 常见坑位

### 10.1 中文输入法

聊天输入框已经做了组合输入保护。  
如果你发现“消息发送后内容又回到输入框”，先检查 `InputArea.tsx` 里的 `onCompositionStart / onCompositionEnd`。

### 10.2 任务状态覆盖

`lib/storage.ts` 的任务更新不是简单整对象覆盖，而是做了图片与任务合并。  
这里不要轻易改成直接覆盖写入，否则进度、错误和输出图可能互相覆盖。

### 10.3 模型降级重试

`lib/ai.ts` 里的备用模型顺序就是重试顺序。  
如果要做“权重”或“按场景切换模型”，从这里改最合适。

### 10.4 本地 JSON 存储的边界

目前单机部署很方便，但不适合高并发或多实例共享。  
如果将来要做多人协作或多实例部署，建议优先把 `storage.ts` 抽象成数据库适配层。

---

## 11. 后续建议路线

如果继续打磨，这几个方向收益最高：

1. 聊天记录落库，支持账号隔离
2. 生图任务改成真正后台队列
3. 上传文件改对象存储
4. 加入管理员日志页和失败任务重试页
5. 抽离模型供应商适配层，支持多平台切换

---

## 12. 开发完成后的最低验证

每次提交前至少跑：

```bash
npm run build
```

如果改了页面交互，再补一次手动验证：

1. 聊天发送与编辑
2. 主题切换
3. 自定义生图上传与提交
4. 设置保存
5. 历史记录查看

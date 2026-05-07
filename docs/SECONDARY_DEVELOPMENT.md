# 二开文档（SECONDARY DEVELOPMENT）

## 1. 本地开发

```bash
npm install
npm run dev
```

开发端口：`3003`

## 2. 核心模块说明

- `app/workspace/[id]/page.tsx`  
  工作台主界面：词条编辑、提示词生成、任务入队、结果预览。

- `app/api/jobs/route.ts`  
  任务创建、追加、暂停/继续、取消等控制接口。

- `lib/server-job.ts`  
  后台异步处理器：顺序/并发消费队列，调用生图 API，写入输出。

- `lib/storage.ts`  
  JSON 数据持久化，任务合并更新策略。

- `app/templates/page.tsx`  
  模板管理：系统默认模板与自定义模板使用。

## 3. 新增功能建议流程

1. 在 `lib/types.ts` 扩展类型
2. 在 `app/api/*` 增加后端路由能力
3. 在 `app/*` 页面接入交互
4. `npm run build` 做一次完整校验
5. 清理缓存并重启开发服务（避免 Next 构建缓存脏状态）

## 4. 数据文件说明

- `data/entries.json`：词条模板
- `data/templates.json`：全套模板
- `data/settings.json`：API 设置
- `data/jobs.json`：任务与图片状态
- `data/logs.json`：生成与报错日志

## 5. 注意事项

- 单图连续入队依赖 `jobId` 与后端合并更新策略，修改任务逻辑时不要改成整对象覆盖写入。
- `public/outputs` 文件通过 `/api/images/[...path]` 动态读取，避免生产环境静态资源缓存问题。


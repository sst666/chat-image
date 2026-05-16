# 加菲猫chat image 部署文档

本文覆盖四种部署方式：

1. 直接使用 Node.js 运行
2. PM2 守护运行
3. Docker / Docker Compose
4. Nginx + systemd 反向代理部署

---

## 1. 环境要求

### 最低要求

- Node.js 18 及以上
- npm 9 及以上
- Linux / macOS / Windows 均可

### 推荐生产环境

- Node.js 20 LTS
- 2 核 CPU
- 4 GB 内存
- 20 GB 可用磁盘

---

## 2. 先了解几个关键目录

项目运行时会写入以下目录：

- `data/`：设置、任务、日志、历史数据
- `public/uploads/`：上传素材
- `public/outputs/`：生成图片结果

部署时一定要保证这三个目录有写权限，并且在升级时不要误删。

---

## 3. 方式一：Node.js 直接部署

### 3.1 拉取代码并安装

```bash
git clone https://github.com/sst666/chat-image.git
cd chat-image
npm install
```

### 3.2 构建

```bash
npm run build
```

### 3.3 启动

默认端口是 `306`：

```bash
npm run start
```

自定义端口示例：

```bash
PORT=3080 HOST=0.0.0.0 npm run start
```

### 3.4 健康检查

```bash
curl http://127.0.0.1:306/api/health
```

---

## 4. 方式二：PM2 部署

适合已经在服务器上使用 Node.js 多应用托管的场景。

### 4.1 安装 PM2

```bash
npm install -g pm2
```

### 4.2 启动

项目已内置 PM2 配置文件：

```bash
pm2 start ecosystem.config.cjs
```

查看状态：

```bash
pm2 status
pm2 logs chat-image
```

设置开机自启：

```bash
pm2 startup
pm2 save
```

---

## 5. 方式三：Docker 单容器部署

项目已提供多阶段 `Dockerfile`，并启用了 Next.js `standalone` 输出。

### 5.1 构建镜像

```bash
docker build -t chat-image:latest .
```

### 5.2 启动容器

```bash
docker run -d \
  --name chat-image \
  -p 306:306 \
  -e NODE_ENV=production \
  -e PORT=306 \
  -e HOST=0.0.0.0 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/public/uploads:/app/public/uploads \
  -v $(pwd)/public/outputs:/app/public/outputs \
  --restart unless-stopped \
  chat-image:latest
```

### 5.3 查看日志

```bash
docker logs -f chat-image
```

### 5.4 健康检查

```bash
docker exec chat-image wget -qO- http://127.0.0.1:306/api/health
```

---

## 6. 方式四：Docker Compose 部署

这是最推荐的方式，升级和迁移都比较省心。

### 6.1 准备环境变量

复制示例文件：

```bash
cp .env.example .env
```

默认内容：

```env
APP_PORT=306
```

### 6.2 启动

```bash
docker compose up -d --build
```

### 6.3 查看状态

```bash
docker compose ps
docker compose logs -f
```

### 6.4 停止

```bash
docker compose down
```

---

## 7. 反向代理：Nginx

如果需要绑定域名，推荐加 Nginx。

示例配置已提供：

- [deploy/nginx/chat-image.conf.example](/Users/sst/Documents/New%20project%202/deploy/nginx/chat-image.conf.example)

使用方法：

1. 复制到 Nginx 站点目录
2. 把 `server_name _;` 改成你的域名
3. `proxy_pass` 默认指向 `127.0.0.1:306`
4. 重载 Nginx

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 8. systemd 守护

适合不使用 Docker，但需要开机自启的 Linux 服务器。

示例文件已提供：

- [deploy/systemd/chat-image.service](/Users/sst/Documents/New%20project%202/deploy/systemd/chat-image.service)

使用步骤：

1. 把项目放到例如 `/opt/chat-image`
2. 按实际路径修改 `WorkingDirectory`
3. 复制 service 文件到：

```bash
sudo cp deploy/systemd/chat-image.service /etc/systemd/system/chat-image.service
```

4. 重新加载并启动：

```bash
sudo systemctl daemon-reload
sudo systemctl enable chat-image
sudo systemctl start chat-image
sudo systemctl status chat-image
```

---

## 9. 首次上线后的初始化

应用启动后，打开：

- `http://你的地址:306/settings`

然后配置：

- API Key
- 默认生图模型
- 备用生图模型列表
- 重试次数

说明：

- `API Base URL` 已固定为 `https://api.bywlai.cn`
- 获取 Key 地址：<https://api.bywlai.cn/>

---

## 10. 升级步骤

### Node/PM2 模式

```bash
git pull
npm install
npm run build
pm2 restart chat-image
```

如果不是 PM2，而是 systemd：

```bash
sudo systemctl restart chat-image
```

### Docker Compose 模式

```bash
git pull
docker compose up -d --build
```

---

## 11. 故障排查

### 11.1 页面样式异常 / 白屏

```bash
rm -rf .next
npm run build
npm run start
```

### 11.2 生图失败

检查：

- API Key 是否有效
- 默认生图模型是否可用
- 备用模型名称是否填写正确
- `data/logs.json` 是否记录了失败详情

### 11.3 上传或输出目录无法写入

确认以下目录权限：

```bash
chmod -R 755 data public/uploads public/outputs
```

Docker 模式下请确认宿主机挂载目录本身可写。

### 11.4 健康检查失败

先在容器或服务器本机执行：

```bash
curl http://127.0.0.1:306/api/health
```

如果这里不通，先排查应用进程本身；如果这里通但外部不通，再排查 Nginx、防火墙或云安全组。

---

## 12. 建议的生产发布策略

推荐顺序：

1. 本地执行 `npm run build`
2. 预发布机或测试容器验证
3. 备份 `data/` 与 `public/outputs/`
4. 再执行生产升级

如果后续准备接入数据库、对象存储或鉴权系统，建议先保留当前 JSON 存储结构作为兼容层，避免一次性重写所有页面与接口。

# 🚀 快速开始指南

5 分钟让你的 MindMap AI 跑起来！

## 方式一：一键检查配置（推荐）

```bash
# 1. 克隆项目
git clone <your-repo-url>
cd mindmap-ai

# 2. 安装依赖
npm install
cd backend && pip install -r requirements.txt && cd ..

# 3. 运行配置检查
npm run check-config
```

根据提示配置环境变量，然后启动服务。

---

## 方式二：手动逐步配置

### Step 1: 安装依赖

```bash
# 前端
npm install

# 后端
cd backend
pip install -r requirements.txt
cd ..
```

### Step 2: 配置 Supabase

1. 访问 [supabase.com](https://supabase.com) 创建免费账户
2. 新建项目，等待初始化完成
3. 进入 **Settings > API**，复制：
   - `Project URL` → `SUPABASE_URL`
   - `anon/public` key → `SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

4. 运行数据库迁移：
   ```bash
   # 在 Supabase SQL Editor 中执行
   # 文件: supabase/migrations/20260307_mindmap_ai_backend.sql
   # 文件: supabase/migrations/20260318_task_records.sql
   ```

### Step 3: 配置环境变量

```bash
# 前端
cp .env.example .env
# 编辑 .env，填入 Supabase URL 和 Key

# 后端
cd backend
cp .env.example .env
# 编辑 .env，填入所有配置

# 生成加密密钥
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
# 将输出填入 APP_ENCRYPTION_KEY
```

### Step 4: 启动服务

```bash
# 终端 1: Redis（如果本地没有，可以跳过，使用内存队列）
redis-server

# 终端 2: 后端 API
cd backend
uvicorn app.main:app --reload

# 终端 3: Celery Worker
cd backend
celery -A celery_worker.celery_app worker --loglevel=info

# 终端 4: 前端
npm start
```

### Step 5: 配置 AI API Key

1. 访问 [DeepSeek](https://platform.deepseek.com/) 注册账号
2. 创建 API Key
3. 打开应用 `http://localhost:8081`
4. 进入 **设置 > API Key**，粘贴并保存

---

## 🎯 验证安装

打开浏览器访问 `http://localhost:8081`，你应该看到：

1. ✅ 登录页面（说明 Supabase 配置正确）
2. ✅ 设置页面可以保存 API Key
3. ✅ 上传 PDF 文件后显示进度条
4. ✅ AI 生成思维导图

---

## 🆘 常见问题

### 前端报错：Missing Supabase environment variables

```bash
# 检查 .env 文件是否存在
cat .env

# 重新启动 Expo
npm start -- --clear
```

### 后端报错：SUPABASE_URL is required

```bash
cd backend
cat .env  # 确认配置存在

# 如果 .env 不存在
cp .env.example .env
# 编辑填入配置
```

### Celery 报错：Connection refused

Redis 未启动，二选一：

**选项 A: 启动 Redis**
```bash
redis-server
```

**选项 B: 使用内存队列（仅开发）**
```bash
# backend/.env
CELERY_BROKER_URL=memory://
CELERY_RESULT_BACKEND=cache+memory://
```

### AI 生成失败

1. 检查设置中是否正确保存了 DeepSeek API Key
2. 检查后端日志是否有错误
3. 确认 DeepSeek API Key 有效且有余额

---

## 📚 下一步

- 阅读完整 [README.md](README.md)
- 查看 [API 文档](backend/README.md)
- 部署到生产环境

---

## 💡 开发提示

```bash
# 快速检查配置
npm run check-config

# 重置项目（清除缓存）
npm run reset-project

# 代码检查
npm run lint
```

Happy Coding! 🎉

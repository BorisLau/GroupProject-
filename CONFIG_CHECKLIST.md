# ✅ 配置验证清单

使用此清单逐项验证配置是否正确。

## 前端配置

- [ ] 已创建 `.env` 文件（复制自 `.env.example`）
- [ ] `EXPO_PUBLIC_SUPABASE_URL` 已填写（格式: `https://xxx.supabase.co`）
- [ ] `EXPO_PUBLIC_SUPABASE_KEY` 已填写（以 `eyJhbG` 开头的 anon key）
- [ ] `EXPO_PUBLIC_BACKEND_URL` 已填写或保持默认 `http://localhost:8000`

## 后端配置

- [ ] 已创建 `backend/.env` 文件（复制自 `backend/.env.example`）
- [ ] `SUPABASE_URL` 已填写（与前端 URL 相同）
- [ ] `SUPABASE_ANON_KEY` 已填写（与前端 key 相同）
- [ ] `SUPABASE_SERVICE_ROLE_KEY` 已填写（以 `eyJhbG` 开头的 service_role key）
- [ ] `APP_ENCRYPTION_KEY` 已填写（运行 Python 命令生成）

## 数据库配置

- [ ] 已创建 Supabase 项目
- [ ] 已执行 `20260307_mindmap_ai_backend.sql` 迁移
- [ ] 已执行 `20260318_task_records.sql` 迁移
- [ ] 在 Table Editor 中能看到 `user_ai_settings`, `mindmaps`, `mindmap_jobs`, `task_records` 表

## 验证命令

```bash
# 运行配置检查
npm run check-config

# 期望输出:
# ✅ 所有配置正确！可以启动应用了。
```

## 启动验证

```bash
# 1. 启动后端
cd backend
uvicorn app.main:app --reload
# 期望: Application startup complete. 无错误

# 2. 启动 Celery（可选）
celery -A celery_worker.celery_app worker --loglevel=info
# 期望: Connected to redis, ready to accept tasks

# 3. 启动前端
npm start
# 期望: 看到 "Transform keys are not sorted" 警告是正常的
```

## 功能验证

- [ ] 能正常访问登录页面 `http://localhost:8081/login`
- [ ] 能注册新账号
- [ ] 能在设置页面保存 DeepSeek API Key
- [ ] 能上传 PDF 文件并看到进度条
- [ ] 能成功生成思维导图

## 故障排查

### 问题 1: 配置检查失败
```bash
# 重新复制模板
cp .env.example .env
cd backend && cp .env.example .env

# 重新填写配置
nano .env
nano backend/.env

# 再次检查
npm run check-config
```

### 问题 2: 后端启动报错
```bash
# 检查 Python 环境
python --version  # 需要 3.11+

# 检查依赖
pip list | grep -E "(fastapi|supabase|celery)"

# 重新安装依赖
pip install -r requirements.txt
```

### 问题 3: 前端无法连接后端
```bash
# 检查后端是否运行
curl http://localhost:8000/health
# 期望: {"ok": true}

# 检查前端配置
cat .env | grep BACKEND_URL
```

### 问题 4: 数据库报错
```bash
# 检查表是否存在
# 在 Supabase SQL Editor 运行:
SELECT * FROM information_schema.tables 
WHERE table_schema = 'public';

# 期望看到: user_ai_settings, mindmaps, mindmap_jobs, task_records
```

---

**全部勾选完成后，应用就可以完整运行了！** 🎉

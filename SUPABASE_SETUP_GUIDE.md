# Supabase 配置完整指南

## 1. 创建 Supabase 项目

### 步骤
1. 访问 [https://supabase.com](https://supabase.com)
2. 点击 "New Project"
3. 填写信息：
   - **Name**: `mindmap-ai` (或任意名称)
   - **Database Password**: 生成强密码并保存
   - **Region**: 选择离你最近的区域（如 Singapore）
4. 点击 "Create new project"
5. 等待初始化完成（约 1-2 分钟）

---

## 2. 获取 API 凭证

### 步骤
1. 在项目 dashboard 左侧菜单点击 **Settings** (齿轮图标)
2. 点击 **API**
3. 复制以下值：

```
Project URL: https://<random-string>.supabase.co
             └─► EXPO_PUBLIC_SUPABASE_URL (前端)
             └─► SUPABASE_URL (后端)

anon/public key: eyJhbGciOiJIUzI1NiIs...
                 └─► EXPO_PUBLIC_SUPABASE_KEY (前端)
                 └─► SUPABASE_ANON_KEY (后端)

service_role key: eyJhbGciOiJIUzI1NiIs...
                  ⚠️ 保密！只用于后端
                  └─► SUPABASE_SERVICE_ROLE_KEY (后端)
```

### 安全提示
- `anon` key: 可以公开，用于前端
- `service_role` key: **绝对保密**，具有数据库完全访问权限

---

## 3. 运行数据库迁移

### 步骤 1: 打开 SQL Editor
1. 左侧菜单点击 **SQL Editor**
2. 点击 **New query**

### 步骤 2: 执行第一个迁移文件

复制以下 SQL（来自 `supabase/migrations/20260307_mindmap_ai_backend.sql`）:

```sql
-- Enable pgcrypto extension
create extension if not exists pgcrypto;

-- Create user_ai_settings table
CREATE TABLE IF NOT EXISTS public.user_ai_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  deepseek_api_key_encrypted text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create mindmaps table
CREATE TABLE IF NOT EXISTS public.mindmaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  source_file_name text NOT NULL,
  source_file_type text NOT NULL,
  model text NOT NULL,
  graph_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create mindmap_jobs table
CREATE TABLE IF NOT EXISTS public.mindmap_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('queued', 'processing', 'succeeded', 'failed')),
  file_name text NOT NULL,
  file_type text NOT NULL,
  title text,
  max_nodes integer,
  language text,
  error_message text,
  mindmap_id uuid REFERENCES public.mindmaps (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_mindmaps_user_id_created_at
  ON public.mindmaps (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mindmap_jobs_user_id_created_at
  ON public.mindmap_jobs (user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.user_ai_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mindmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mindmap_jobs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "user_ai_settings_select_own"
  ON public.user_ai_settings FOR SELECT
  TO authenticated USING (user_id = auth.uid());

CREATE POLICY "user_ai_settings_insert_own"
  ON public.user_ai_settings FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_ai_settings_update_own"
  ON public.user_ai_settings FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "mindmaps_select_own"
  ON public.mindmaps FOR SELECT
  TO authenticated USING (user_id = auth.uid());

CREATE POLICY "mindmaps_insert_own"
  ON public.mindmaps FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "mindmap_jobs_select_own"
  ON public.mindmap_jobs FOR SELECT
  TO authenticated USING (user_id = auth.uid());

CREATE POLICY "mindmap_jobs_insert_own"
  ON public.mindmap_jobs FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "mindmap_jobs_update_own"
  ON public.mindmap_jobs FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```

点击 **Run** 执行。

### 步骤 3: 执行第二个迁移文件

复制以下 SQL（来自 `supabase/migrations/20260318_task_records.sql`）:

```sql
-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create task_records table
CREATE TABLE IF NOT EXISTS public.task_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  title text NOT NULL,
  mindmap_graph jsonb NOT NULL,
  selected_file_name text NOT NULL DEFAULT '',
  generation_status text NOT NULL DEFAULT '',
  is_generating boolean NOT NULL DEFAULT false,
  source_mindmap_id uuid REFERENCES public.mindmaps (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_task_records_user_id_updated_at
  ON public.task_records (user_id, updated_at DESC);

-- Create trigger
DROP TRIGGER IF EXISTS set_task_records_updated_at ON public.task_records;

CREATE TRIGGER set_task_records_updated_at
BEFORE UPDATE ON public.task_records
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_timestamp();

-- Enable RLS
ALTER TABLE public.task_records ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "task_records_select_own"
  ON public.task_records FOR SELECT
  TO authenticated USING (user_id = auth.uid());

CREATE POLICY "task_records_insert_own"
  ON public.task_records FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "task_records_update_own"
  ON public.task_records FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "task_records_delete_own"
  ON public.task_records FOR DELETE
  TO authenticated USING (user_id = auth.uid());
```

点击 **Run** 执行。

---

## 4. 配置身份验证（可选但推荐）

### 启用邮箱验证
1. 左侧菜单点击 **Authentication**
2. 点击 **Providers**
3. 确保 **Email** 已启用
4. （可选）关闭 "Confirm email" 让注册更简单

### 配置 OAuth 提供商（可选）
1. 在 Providers 页面
2. 启用 Google/GitHub 等
3. 填入对应的 Client ID 和 Secret

---

## 5. 填写项目环境变量

### 前端 `.env`
```bash
# 在项目根目录
nano .env

# 填入:
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=your-anon-key
EXPO_PUBLIC_BACKEND_URL=http://localhost:8000
```

### 后端 `backend/.env`
```bash
cd backend
nano .env

# 填入:
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
APP_ENCRYPTION_KEY=your-fernet-key
```

---

## 6. 生成 Fernet 加密密钥

```bash
# 进入后端目录
cd backend

# 生成密钥
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# 输出示例:
# gAAAAABl...

# 将输出填入 backend/.env 的 APP_ENCRYPTION_KEY
```

**⚠️ 重要**: 保存好这个密钥！丢失后无法解密已存储的用户 API Keys。

---

## 7. 验证配置

```bash
# 在项目根目录运行
npm run check-config

# 应该看到:
# ✅ 所有配置正确！可以启动应用了。
```

---

## 8. 启动服务

```bash
# 终端 1: 后端 API
cd backend
uvicorn app.main:app --reload

# 终端 2: Celery Worker
cd backend
celery -A celery_worker.celery_app worker --loglevel=info

# 终端 3: 前端
npm start
```

访问 `http://localhost:8081`，注册账号开始使用！

---

## 常见问题

### Q: 提示 "relation 'user_ai_settings' does not exist"
**A**: SQL 迁移未执行，请检查步骤 3。

### Q: 提示 "new row violates row-level security policy"
**A**: RLS 策略已启用，确保使用 `service_role` key 进行服务端写入。

### Q: 如何重置数据库？
**A**: 
1. Settings > Database
2. 点击 "Reset database"
3. 重新执行 SQL 迁移

---

## 下一步

配置完成后，获取 DeepSeek API Key:
1. 访问 [https://platform.deepseek.com](https://platform.deepseek.com)
2. 注册账号
3. 创建 API Key
4. 在应用设置页面粘贴使用

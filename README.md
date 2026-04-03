# 🧠 MindMap AI - AI 驱动的思维导图生成器

> 上传文档，AI 自动生成结构化思维导图

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ 功能特性

- 📄 **多格式支持**: PDF, Word (DOCX), TXT, Markdown
- 🤖 **AI 智能生成**: 基于 DeepSeek API 自动提取关键信息
- 🔒 **安全存储**: API Key 加密存储，用户数据隔离
- ⚡ **异步处理**: Celery 任务队列，支持大文件
- 🎨 **可视化编辑**: 交互式思维导图编辑器

## 🚀 快速开始

### 前置要求

- Node.js 18+
- Python 3.11+
- Redis (用于任务队列)
- Supabase 账号

### 1. 克隆项目

```bash
git clone https://github.com/your-org/mindmap-ai.git
cd mindmap-ai
```

### 2. 安装依赖

```bash
# 前端依赖
npm install

# 后端依赖
cd backend
pip install -r requirements.txt
cd ..
```

### 3. 配置环境变量

```bash
# 复制前端配置模板
cp .env.example .env

# 复制后端配置模板
cd backend
cp .env.example .env
cd ..
```

### 4. 获取 Supabase 配置

1. 访问 [Supabase Dashboard](https://supabase.com/dashboard)
2. 创建新项目或选择现有项目
3. 进入 **Settings > API**
4. 复制以下值填入 `.env` 文件：

```bash
# 前端 .env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=your-anon-key

# 后端 backend/.env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 5. 生成加密密钥

```bash
cd backend
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

将生成的密钥填入 `backend/.env`：
```bash
APP_ENCRYPTION_KEY=your-generated-key
```

### 6. 启动服务

```bash
# 终端 1: 启动后端 API
cd backend
uvicorn app.main:app --reload --port 8000

# 终端 2: 启动 Celery Worker
cd backend
celery -A celery_worker.celery_app worker --loglevel=info

# 终端 3: 启动前端（在项目根目录）
npm start
```

### 7. 配置 AI API Key

1. 访问 [DeepSeek](https://platform.deepseek.com/) 获取 API Key
2. 打开应用 **设置页面**
3. 输入 API Key 并保存
4. 开始使用！

---

## 📁 项目结构

```
mindmap-ai/
├── app/                    # Expo 前端页面
├── components/             # React Native 组件
├── lib/                    # 工具函数和 API 客户端
├── contexts/               # React Context
├── hooks/                  # 自定义 Hooks
├── backend/                # FastAPI 后端
│   ├── app/
│   │   ├── main.py         # API 路由
│   │   ├── tasks.py        # Celery 任务
│   │   ├── deepseek.py     # AI 调用
│   │   ├── security.py     # 加密模块
│   │   └── config.py       # 配置管理
│   └── requirements.txt
├── supabase/               # 数据库迁移文件
│   └── migrations/
└── .env.example            # 环境变量模板
```

---

## ⚙️ 环境变量配置指南

### 前端环境变量 (`.env`)

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| `EXPO_PUBLIC_SUPABASE_URL` | ✅ | - | Supabase 项目 URL |
| `EXPO_PUBLIC_SUPABASE_KEY` | ✅ | - | Supabase Anon Key |
| `EXPO_PUBLIC_BACKEND_URL` | ❌ | `http://localhost:8000` | 后端 API 地址 |

### 后端环境变量 (`backend/.env`)

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| `SUPABASE_URL` | ✅ | - | Supabase 项目 URL |
| `SUPABASE_ANON_KEY` | ✅ | - | Supabase Anon Key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | - | Supabase Service Role Key |
| `APP_ENCRYPTION_KEY` | ✅ | - | Fernet 加密密钥 |
| `REDIS_URL` | ❌ | `redis://localhost:6379/0` | Redis 连接 URL |
| `DEEPSEEK_BASE_URL` | ❌ | `https://api.deepseek.com` | DeepSeek API 地址 |

---

## 🔧 常见问题

### Q: 启动时提示 "Missing Supabase environment variables"

**A:** 请检查：
1. 项目根目录是否存在 `.env` 文件
2. `.env` 文件中是否配置了 `EXPO_PUBLIC_SUPABASE_URL` 和 `EXPO_PUBLIC_SUPABASE_KEY`
3. 修改后是否重启了 Expo 开发服务器

```bash
# 重新启动前端
npm start
```

### Q: 后端启动提示 "SUPABASE_URL is required"

**A:** 后端需要独立的 `.env` 配置：

```bash
cd backend
cp .env.example .env
# 编辑 .env 填入 Supabase 配置
uvicorn app.main:app --reload
```

### Q: 如何获取 DeepSeek API Key？

**A:** 
1. 访问 [DeepSeek 平台](https://platform.deepseek.com/)
2. 注册账号
3. 进入 **API Keys** 页面创建新 Key
4. 在应用设置页面粘贴 Key

### Q: 上传文件后没有反应？

**A:** 检查以下几点：
1. 后端服务是否运行 (`uvicorn app.main:app`)
2. Celery Worker 是否运行
3. Redis 是否启动
4. 浏览器/控制台是否有错误信息

### Q: 生产环境如何部署？

**A:** 项目已配置 [Render](https://render.com) 一键部署：

1. Fork 本项目到 GitHub
2. 在 Render 创建 Blueprint
3. 填入必需的环境变量
4. 自动部署 Web 服务 + Worker + Redis

详见 `backend/README.md`

---

## 🛠️ 开发指南

### 运行配置检查

```bash
# 前端配置检查
node scripts/setup-env.js

# 后端配置检查
cd backend
python -c "from app.config_validator import validate_config; validate_config()"
```

### 代码规范

```bash
# 前端代码检查
npm run lint

# 后端代码格式化
cd backend
black app/
```

### 运行测试

```bash
# 后端测试
cd backend
pytest
```

---

## 📄 许可证

[MIT License](LICENSE)

---

## 🤝 贡献

欢迎提交 Issue 和 PR！

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

---

## 📞 支持

如有问题，请提交 [GitHub Issue](https://github.com/your-org/mindmap-ai/issues)

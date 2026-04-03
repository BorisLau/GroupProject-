"""
环境变量配置验证模块
在应用启动时检查必填环境变量，提供清晰的错误提示
"""

import os
import sys
from typing import Optional


class ConfigValidationError(Exception):
    """配置验证错误"""
    pass


def check_required_env_var(name: str, hint: str = "") -> Optional[str]:
    """
    检查必填环境变量
    
    Args:
        name: 环境变量名
        hint: 获取方式的提示
        
    Returns:
        环境变量值，如果缺失则返回 None
    """
    value = os.getenv(name)
    if not value or value.strip() == "" or value.startswith("<"):
        return None
    return value


def validate_development_config() -> list[str]:
    """
    验证开发环境配置
    返回缺失的配置项列表（可能为空，表示配置完整）
    """
    errors = []
    warnings = []
    
    # 必填项（开发环境相对宽松）
    required_vars = [
        ("SUPABASE_URL", "https://supabase.com/dashboard > Settings > API > URL"),
        ("SUPABASE_ANON_KEY", "https://supabase.com/dashboard > Settings > API > anon/public"),
        ("SUPABASE_SERVICE_ROLE_KEY", "https://supabase.com/dashboard > Settings > API > service_role（保密！）"),
        ("APP_ENCRYPTION_KEY", "运行: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""),
    ]
    
    for var_name, hint in required_vars:
        value = check_required_env_var(var_name)
        if not value:
            errors.append(f"  ❌ {var_name}: 缺失或无效\n     获取方式: {hint}")
    
    # 可选项（有默认值，但建议配置）
    optional_vars = [
        ("REDIS_URL", "Redis 用于 Celery 任务队列，开发模式可跳过"),
        ("CELERY_BROKER_URL", "默认使用 redis://localhost:6379/0"),
    ]
    
    for var_name, hint in optional_vars:
        value = check_required_env_var(var_name)
        if not value:
            warnings.append(f"  ⚠️  {var_name}: 未配置（{hint}）")
    
    return errors, warnings


def validate_production_config() -> list[str]:
    """
    验证生产环境配置
    严格检查，缺失则拒绝启动
    """
    errors = []
    
    required_vars = [
        ("SUPABASE_URL", "Supabase 项目 URL"),
        ("SUPABASE_ANON_KEY", "Supabase Anon Key"),
        ("SUPABASE_SERVICE_ROLE_KEY", "Supabase Service Role Key（保密！）"),
        ("APP_ENCRYPTION_KEY", "Fernet 加密密钥（生成后妥善保存）"),
        ("REDIS_URL", "Redis URL 用于 Celery（生产环境必填）"),
        ("CELERY_BROKER_URL", "Celery Broker URL"),
        ("CELERY_RESULT_BACKEND", "Celery Result Backend"),
    ]
    
    for var_name, description in required_vars:
        value = check_required_env_var(var_name)
        if not value:
            errors.append(f"  ❌ {var_name}: {description}")
    
    # 验证 CORS 配置
    cors_origins = os.getenv("CORS_ORIGINS", "*")
    if cors_origins == "*":
        errors.append("  ❌ CORS_ORIGINS: 生产环境不能设置为 *，请指定具体域名")
    
    return errors, []


def print_config_status(errors: list[str], warnings: list[str], env: str = "development"):
    """打印配置状态"""
    print("\n" + "=" * 60)
    print(f"🔧 环境配置检查 ({env} 模式)")
    print("=" * 60)
    
    if not errors and not warnings:
        print("\n✅ 所有配置正确！应用即将启动...\n")
        return True
    
    if warnings:
        print("\n⚠️  警告（不影响运行，但建议配置）:")
        for warning in warnings:
            print(warning)
    
    if errors:
        print("\n❌ 错误（必须修复）:")
        for error in errors:
            print(error)
        
        print("\n" + "-" * 60)
        print("📖 快速修复指南:")
        print("   1. 复制配置文件: cp .env.example .env")
        print("   2. 编辑 .env 文件，填入你的配置值")
        print("   3. 重启应用")
        print("\n   详细文档: https://github.com/your-org/mindmap-ai#环境配置")
        print("-" * 60 + "\n")
        return False
    
    print()
    return True


def validate_config(strict: bool = False) -> bool:
    """
    验证配置主函数
    
    Args:
        strict: 是否严格模式（生产环境）
        
    Returns:
        配置是否有效
    """
    env = os.getenv("ENV", "development")
    is_production = env == "production" or strict
    
    if is_production:
        errors, warnings = validate_production_config()
    else:
        errors, warnings = validate_development_config()
    
    is_valid = print_config_status(errors, warnings, env)
    
    if not is_valid and is_production:
        sys.exit(1)  # 生产环境配置无效，拒绝启动
    
    return is_valid


# 便捷的验证装饰器
def require_config(func):
    """装饰器：在函数执行前验证配置"""
    def wrapper(*args, **kwargs):
        if not validate_config():
            raise ConfigValidationError("配置验证失败，请检查环境变量")
        return func(*args, **kwargs)
    return wrapper


if __name__ == "__main__":
    # 直接运行此文件进行配置检查
    validate_config()

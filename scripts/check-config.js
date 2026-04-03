#!/usr/bin/env node

/**
 * 统一配置检查脚本
 * 检查前后端环境变量配置
 * 运行: npm run check-config 或 node scripts/check-config.js
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

const log = {
  info: (msg) => console.log(colors.cyan + 'ℹ ' + colors.reset + msg),
  success: (msg) => console.log(colors.green + '✓ ' + colors.reset + msg),
  warning: (msg) => console.log(colors.yellow + '⚠ ' + colors.reset + msg),
  error: (msg) => console.log(colors.red + '✗ ' + colors.reset + msg),
  divider: () => console.log(colors.gray + '─'.repeat(60) + colors.reset),
};

function checkFrontendConfig() {
  console.log('\n📱 前端配置检查\n');
  
  const envPath = path.join(__dirname, '..', '.env');
  const examplePath = path.join(__dirname, '..', '.env.example');
  
  if (!fs.existsSync(envPath)) {
    log.error('未找到 .env 文件');
    log.info('请复制模板文件: cp .env.example .env');
    return false;
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const vars = {};
  
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (match) {
      vars[match[1]] = match[2].trim();
    }
  });
  
  const required = [
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_KEY',
  ];
  
  let allValid = true;
  
  required.forEach(name => {
    const value = vars[name];
    if (!value || value.startsWith('<')) {
      log.error(`${name}: 未配置`);
      allValid = false;
    } else {
      const masked = value.length > 20 ? value.substring(0, 20) + '...' : value;
      log.success(`${name}: ${masked}`);
    }
  });
  
  // 可选配置
  const optional = ['EXPO_PUBLIC_BACKEND_URL'];
  optional.forEach(name => {
    if (vars[name] && !vars[name].startsWith('<')) {
      log.success(`${name}: ${vars[name]}`);
    } else {
      log.warning(`${name}: 使用默认值 (http://localhost:8000)`);
    }
  });
  
  return allValid;
}

function checkBackendConfig() {
  console.log('\n🔧 后端配置检查\n');
  
  const envPath = path.join(__dirname, '..', 'backend', '.env');
  const examplePath = path.join(__dirname, '..', 'backend', '.env.example');
  
  if (!fs.existsSync(envPath)) {
    log.error('未找到 backend/.env 文件');
    log.info('请复制模板文件: cd backend && cp .env.example .env');
    return false;
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const vars = {};
  
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (match) {
      vars[match[1]] = match[2].trim();
    }
  });
  
  const required = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'APP_ENCRYPTION_KEY',
  ];
  
  let allValid = true;
  
  required.forEach(name => {
    const value = vars[name];
    if (!value || value.startsWith('<') || value === 'replace_with_fernet_key') {
      log.error(`${name}: 未配置或使用了占位符`);
      allValid = false;
    } else {
      const masked = value.length > 15 ? value.substring(0, 15) + '...' : value;
      log.success(`${name}: ${masked}`);
    }
  });
  
  return allValid;
}

function printSummary(frontendOk, backendOk) {
  log.divider();
  console.log('\n📋 检查结果\n');
  
  if (frontendOk && backendOk) {
    console.log(colors.green + '✅ 所有配置正确！可以启动应用了。' + colors.reset);
    console.log('\n启动命令:');
    console.log('  后端: cd backend && uvicorn app.main:app --reload');
    console.log('  前端: npm start\n');
  } else {
    console.log(colors.red + '❌ 配置不完整，请修复上述错误。' + colors.reset);
    console.log('\n快速修复:');
    console.log('  1. 复制 .env.example 为 .env');
    console.log('  2. 填入你的配置值（去掉 <> 括号）');
    console.log('  3. 重新运行检查: npm run check-config\n');
  }
  
  log.divider();
}

// 主函数
function main() {
  console.log('\n' + '═'.repeat(60));
  console.log('  🔍 MindMap AI - 环境配置检查');
  console.log('═'.repeat(60));
  
  const frontendOk = checkFrontendConfig();
  const backendOk = checkBackendConfig();
  
  printSummary(frontendOk, backendOk);
  
  process.exit(frontendOk && backendOk ? 0 : 1);
}

main();

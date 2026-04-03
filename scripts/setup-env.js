#!/usr/bin/env node

/**
 * 环境变量配置检查脚本
 * 运行: node scripts/setup-env.js
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk') || { green: (s) => s, red: (s) => s, yellow: (s) => s, cyan: (s) => s };

const ENV_FILE = path.join(__dirname, '..', '.env');
const EXAMPLE_FILE = path.join(__dirname, '..', '.env.example');

function checkEnvFile() {
  console.log('\n' + '='.repeat(60));
  console.log('🔧 MindMap AI - 环境配置检查');
  console.log('='.repeat(60) + '\n');

  // 检查 .env 文件是否存在
  if (!fs.existsSync(ENV_FILE)) {
    console.log(chalk.yellow('⚠️  未找到 .env 文件'));
    
    if (fs.existsSync(EXAMPLE_FILE)) {
      console.log(chalk.cyan('\n📋 已找到 .env.example 模板文件'));
      console.log('\n快速修复:');
      console.log('  1. 复制模板文件:');
      console.log(chalk.cyan('     cp .env.example .env'));
      console.log('  2. 编辑 .env 文件，填入你的配置值');
      console.log('  3. 重启应用\n');
    } else {
      console.log(chalk.red('❌ 也未找到 .env.example 模板文件'));
      console.log('请从项目仓库重新下载模板文件\n');
    }
    
    return false;
  }

  // 读取 .env 文件
  const envContent = fs.readFileSync(ENV_FILE, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (match) {
      envVars[match[1]] = match[2].trim();
    }
  });

  // 检查必填项
  const requiredVars = [
    { name: 'EXPO_PUBLIC_SUPABASE_URL', desc: 'Supabase 项目 URL' },
    { name: 'EXPO_PUBLIC_SUPABASE_KEY', desc: 'Supabase Anon Key' },
  ];

  const missing = [];
  const empty = [];

  requiredVars.forEach(({ name, desc }) => {
    if (!(name in envVars)) {
      missing.push({ name, desc });
    } else if (!envVars[name] || envVars[name].startsWith('<')) {
      empty.push({ name, desc });
    }
  });

  // 打印检查结果
  if (missing.length === 0 && empty.length === 0) {
    console.log(chalk.green('✅ 环境配置完整！'));
    console.log('\n已配置变量:');
    requiredVars.forEach(({ name }) => {
      const value = envVars[name];
      const masked = value.length > 10 
        ? value.substring(0, 10) + '...' 
        : value;
      console.log(`  ✓ ${name}=${masked}`);
    });
    console.log('\n可以启动应用了！\n');
    return true;
  }

  // 有缺失的配置
  console.log(chalk.red('❌ 配置不完整\n'));

  if (missing.length > 0) {
    console.log('缺失的变量:');
    missing.forEach(({ name, desc }) => {
      console.log(chalk.red(`  ❌ ${name}`));
      console.log(`     说明: ${desc}`);
    });
    console.log();
  }

  if (empty.length > 0) {
    console.log('需要填写的变量:');
    empty.forEach(({ name, desc }) => {
      console.log(chalk.yellow(`  ⚠️  ${name}`));
      console.log(`     说明: ${desc}`);
      console.log(`     当前值: ${envVars[name] || '(空)'}`);
    });
    console.log();
  }

  console.log('获取 Supabase 配置:');
  console.log('  1. 访问 https://supabase.com/dashboard');
  console.log('  2. 选择你的项目');
  console.log('  3. 进入 Settings > API');
  console.log('  4. 复制 URL 和 anon/public key\n');

  return false;
}

// 运行检查
checkEnvFile();

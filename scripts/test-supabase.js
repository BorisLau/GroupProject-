#!/usr/bin/env node

/**
 * Supabase 连接测试脚本
 * 运行: node scripts/test-supabase.js
 */

const { createClient } = require('@supabase/supabase-js');

// 从 .env 文件读取配置
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');

if (!fs.existsSync(envPath)) {
  console.error('❌ 未找到 .env 文件');
  console.log('请复制 .env.example 为 .env 并填入配置');
  process.exit(1);
}

// 简单的 env 解析
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};

envContent.split('\n').forEach(line => {
  const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
  if (match && !match[2].startsWith('<')) {
    env[match[1]] = match[2].trim();
  }
});

const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = env.EXPO_PUBLIC_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 配置缺失');
  console.log('请在 .env 文件中配置:');
  console.log('  EXPO_PUBLIC_SUPABASE_URL');
  console.log('  EXPO_PUBLIC_SUPABASE_KEY');
  process.exit(1);
}

console.log('🔍 测试 Supabase 连接...\n');
console.log(`URL: ${supabaseUrl}`);
console.log(`Key: ${supabaseKey.substring(0, 20)}...\n`);

// 创建客户端
const supabase = createClient(supabaseUrl, supabaseKey);

// 测试连接
async function testConnection() {
  try {
    // 测试 1: 检查认证服务
    console.log('测试 1: 检查认证服务...');
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.log('⚠️  认证服务检查失败:', authError.message);
    } else {
      console.log('✅ 认证服务正常');
    }

    // 测试 2: 检查数据库表
    console.log('\n测试 2: 检查数据库表...');
    
    const tables = ['user_ai_settings', 'mindmaps', 'mindmap_jobs', 'task_records'];
    
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('count', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: 表存在`);
      }
    }

    // 测试 3: 检查 RLS 策略
    console.log('\n测试 3: 检查数据库连接...');
    const { data, error } = await supabase
      .from('user_ai_settings')
      .select('*')
      .limit(1);
    
    if (error && error.message.includes('row-level security')) {
      console.log('⚠️  RLS 策略已启用（这是正常的）');
      console.log('   匿名用户无法访问数据，需要登录后才能操作');
    } else if (error) {
      console.log('❌ 数据库查询失败:', error.message);
    } else {
      console.log('✅ 数据库查询正常');
    }

    console.log('\n✅ Supabase 连接测试完成！');
    console.log('\n下一步:');
    console.log('  1. 启动后端: cd backend && uvicorn app.main:app --reload');
    console.log('  2. 启动前端: npm start');
    console.log('  3. 访问 http://localhost:8081 注册账号');

  } catch (error) {
    console.error('\n❌ 连接失败:', error.message);
    console.log('\n请检查:');
    console.log('  1. Supabase URL 是否正确');
    console.log('  2. Supabase Key 是否有效');
    console.log('  3. 网络连接是否正常');
    process.exit(1);
  }
}

testConnection();

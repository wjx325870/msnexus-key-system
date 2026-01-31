// api/generate.js - 完整版本
const { createClient } = require('@supabase/supabase-js');

// 创建Supabase客户端
const supabaseUrl = 'https://rzdepwljvkgcaxhpypcm.supabase.co';
const supabaseKey = 'sb_publishable_DNwr0ZVOvw7rXrVB1v3oMA_dmQLUJxK';
const supabase = createClient(supabaseUrl, supabaseKey);

// 内存备份
let memoryKeys = [];

export default async function handler(request, response) {
  // 设置CORS
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Content-Type', 'application/json');

  // 处理预检请求
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  // GET请求：检查该IP是否有未到期卡密
  if (request.method === 'GET') {
    try {
      const userIP = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
      const now = Math.floor(Date.now() / 1000);
      
      let activeKey = null;
      let source = 'memory';
      
      // 1. 从Supabase查询
      try {
        const { data, error } = await supabase
          .from('license_keys')
          .select('*')
          .eq('ip', userIP)
          .eq('status', 'active')
          .gt('expires_at', now)
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (!error && data && data.length > 0) {
          activeKey = data[0];
          source = 'supabase';
        }
      } catch (error) {
        console.error('Supabase查询错误:', error);
      }
      
      // 2. 如果Supabase没有，检查内存
      if (!activeKey) {
        const memoryKey = memoryKeys.find(key => 
          key.ip === userIP && 
          key.expiresAt > now && 
          key.status === 'active'
        );
        
        if (memoryKey) {
          activeKey = memoryKey;
          source = 'memory';
        }
      }
      
      return response.status(200).json({
        success: true,
        hasActiveKey: !!activeKey,
        activeKey: activeKey ? {
          licenseKey: activeKey.license_key || activeKey.licenseKey,
          expiresAt: activeKey.expires_at || activeKey.expiresAt,
          expiresAtReadable: activeKey.expires_at_readable || activeKey.expiresAtReadable,
          generatedAt: activeKey.generated_at || activeKey.generatedAt
        } : null,
        source: source,
        ip: userIP
      });
      
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: '检查失败'
      });
    }
  }

  // POST请求：生成新卡密
  if (request.method === 'POST') {
    try {
      const userIP = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
      const userAgent = request.headers['user-agent'];
      const now = Math.floor(Date.now() / 1000);
      
      // 1. 检查是否有未到期卡密
      let activeKey = null;
      
      // 从Supabase检查
      const { data: supabaseData, error: supabaseError } = await supabase
        .from('license_keys')
        .select('*')
        .eq('ip', userIP)
        .eq('status', 'active')
        .gt('expires_at', now)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (!supabaseError && supabaseData && supabaseData.length > 0) {
        activeKey = supabaseData[0];
      }
      
      // 从内存检查
      if (!activeKey) {
        const memoryKey = memoryKeys.find(key => 
          key.ip === userIP && 
          key.expiresAt > now && 
          key.status === 'active'
        );
        
        if (memoryKey) {
          activeKey = memoryKey;
        }
      }
      
      // 如果有未到期卡密，阻止生成
      if (activeKey) {
        const remaining = (activeKey.expires_at || activeKey.expiresAt) - now;
        const hours = Math.floor(remaining / 3600);
        const minutes = Math.floor((remaining % 3600) / 60);
        
        return response.status(400).json({
          success: false,
          message: `您已有一个未到期卡密，请等待 ${hours}小时${minutes}分钟后重试`,
          data: {
            existingKey: activeKey.license_key || activeKey.licenseKey,
            expiresAt: activeKey.expires_at || activeKey.expiresAt,
            expiresAtReadable: activeKey.expires_at_readable || activeKey.expiresAtReadable,
            remaining: `${hours}小时${minutes}分钟`
          }
        });
      }
      
      // 2. 生成新卡密
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let key = 'MSNX-';
      for (let i = 0; i < 12; i++) {
        key += chars.charAt(Math.floor(Math.random() * chars.length));
        if ((i + 1) % 4 === 0 && i !== 11) key += '-';
      }
      
      const expiresAt = now + (23 * 60 * 60); // 23小时
      const expiresAtReadable = new Date(expiresAt * 1000).toLocaleString('zh-CN');
      const generatedAt = new Date().toLocaleString('zh-CN');
      
      // 3. 保存到Supabase
      let savedToSupabase = false;
      try {
        const { data, error } = await supabase
          .from('license_keys')
          .insert([
            {
              license_key: key,
              expires_at: expiresAt,
              expires_at_readable: expiresAtReadable,
              generated_at: generatedAt,
              status: 'active',
              ip: userIP,
              user_agent: userAgent
            }
          ]);
        
        if (error) {
          console.error('保存到Supabase失败:', error);
        } else {
          savedToSupabase = true;
          console.log('卡密已保存到Supabase:', key);
        }
      } catch (dbError) {
        console.error('数据库连接失败:', dbError);
      }
      
      // 4. 保存到内存备份
      const memoryKey = {
        licenseKey: key,
        expiresAt: expiresAt,
        expiresAtReadable: expiresAtReadable,
        generatedAt: generatedAt,
        status: 'active',
        ip: userIP,
        userAgent: userAgent,
        timestamp: Date.now()
      };
      
      memoryKeys.push(memoryKey);
      
      // 限制内存存储数量
      if (memoryKeys.length > 100) {
        memoryKeys = memoryKeys.slice(-100);
      }
      
      // 5. 返回成功
      return response.status(200).json({
        success: true,
        message: '卡密生成成功',
        data: {
          licenseKey: key,
          expiresAt: expiresAt,
          expiresAtReadable: expiresAtReadable,
          generatedAt: generatedAt,
          storage: savedToSupabase ? 'supabase' : 'memory (supabase failed)',
          ip: userIP
        }
      });
      
    } catch (error) {
      console.error('生成卡密错误:', error);
      return response.status(500).json({
        success: false,
        message: '生成失败'
      });
    }
  }
  
  // 其他请求方法
  return response.status(405).json({
    success: false,
    message: '不允许的请求方法'
  });
}

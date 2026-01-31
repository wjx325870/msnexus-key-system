import { createClient } from '@supabase/supabase-js'

// 内存存储（如果Supabase没配置）
let memoryKeys = [];

export default async function handler(request, response) {
  // 设置CORS
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Content-Type', 'application/json');

  // 处理预检请求
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  if (request.method !== 'POST') {
    return response.status(405).json({
      success: false,
      message: 'Only POST method is allowed'
    });
  }

  try {
    // 1. 生成卡密
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let key = 'MSNX-';
    for (let i = 0; i < 12; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
      if ((i + 1) % 4 === 0 && i !== 11) key += '-';
    }

    // 2. 设置过期时间 (23小时)
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + (23 * 60 * 60);
    const expiresAtReadable = new Date(expiresAt * 1000).toLocaleString('en-US');
    const generatedAt = new Date().toLocaleString('en-US');

    // 3. 尝试保存到Supabase数据库
    let savedToSupabase = false;
    let supabaseError = null;
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    
    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // 插入数据到license_keys表
        const { data, error } = await supabase
          .from('license_keys')
          .insert([
            {
              license_key: key,
              expires_at: expiresAt,
              expires_at_readable: expiresAtReadable,
              generated_at: generatedAt,
              status: 'active'
            }
          ]);
        
        if (error) {
          console.error('Supabase insert error:', error);
          supabaseError = error.message;
        } else {
          savedToSupabase = true;
          console.log('Saved to Supabase:', key);
        }
      } catch (supabaseError) {
        console.error('Supabase connection error:', supabaseError);
      }
    }

    // 4. 也保存到内存（双重备份）
    const memoryKeyData = {
      licenseKey: key,
      expiresAt: expiresAt,
      expiresAtReadable: expiresAtReadable,
      generatedAt: generatedAt,
      status: 'active',
      id: Date.now()
    };
    
    memoryKeys.push(memoryKeyData);
    
    // 限制内存存储数量
    if (memoryKeys.length > 100) {
      memoryKeys = memoryKeys.slice(-100);
    }

    // 5. 返回成功响应
    return response.status(200).json({
      success: true,
      message: 'License key generated successfully',
      data: {
        licenseKey: key,
        expiresAt: expiresAt,
        expiresAtReadable: expiresAtReadable,
        generatedAt: generatedAt,
        storageInfo: {
          savedToDatabase: savedToSupabase,
          databaseError: supabaseError,
          memoryBackup: true,
          memoryCount: memoryKeys.length
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Generate key error:', error);
    return response.status(500).json({
      success: false,
      message: 'Internal server error: ' + error.message
    });
  }
}

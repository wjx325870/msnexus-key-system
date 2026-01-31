// 使用Supabase客户端
import { createClient } from '@supabase/supabase-js';

// 初始化Supabase客户端
const supabaseUrl = 'https://rzdepwljvkgcaxhpypcm.supabase.co';
const supabaseServiceKey = 'sb_publishable_DNwr0ZVOvw7rXrVB1v3oMA_dmQLUJxK'; // 您的服务密钥
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(request, response) {
  // 设置CORS
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Content-Type', 'application/json');

  if (request.method !== 'POST') {
    return response.status(405).json({
      success: false,
      message: 'Only POST method allowed'
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

    // 2. 设置过期时间（23小时后）
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + (23 * 60 * 60);

    // 3. 保存到Supabase
    const { data, error } = await supabase
      .from('license_keys')
      .insert([
        {
          license_key: key,
          expires_at: expiresAt,
          status: 'active'
        }
      ]);

    if (error) {
      console.error('Supabase插入错误:', error);
      return response.status(500).json({
        success: false,
        message: 'Failed to save key to database',
        error: error.message
      });
    }

    console.log(`✅ Key saved to Supabase: ${key}`);

    // 4. 返回成功响应
    return response.status(200).json({
      success: true,
      message: 'License key generated and saved',
      data: {
        licenseKey: key,
        expiresAt: expiresAt,
        expiresAtReadable: new Date(expiresAt * 1000).toISOString()
      }
    });

  } catch (error) {
    console.error('生成错误:', error);
    return response.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

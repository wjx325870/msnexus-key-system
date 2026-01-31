import { createClient } from '@supabase/supabase-js';

// 使用公共密钥进行读取
const supabaseUrl = 'https://rzdepwljvkgcaxhpypcm.supabase.co';
const supabaseAnonKey = '您的匿名公钥'; // 从Supabase API设置获取
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function handler(request, response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Content-Type', 'application/json');

  if (request.method !== 'POST') {
    return response.status(405).json({
      success: false,
      message: 'Only POST method allowed'
    });
  }

  try {
    const { licenseKey } = request.body;

    if (!licenseKey) {
      return response.status(400).json({
        success: false,
        message: 'License key is required'
      });
    }

    // 查询数据库
    const { data, error } = await supabase
      .from('license_keys')
      .select('*')
      .eq('license_key', licenseKey)
      .single();

    if (error || !data) {
      return response.status(404).json({
        success: false,
        message: 'License key not found'
      });
    }

    const now = Math.floor(Date.now() / 1000);
    
    // 检查状态
    if (data.status !== 'active') {
      return response.status(200).json({
        success: false,
        message: `License is ${data.status}`,
        data: data
      });
    }

    // 检查是否过期
    if (data.expires_at < now) {
      return response.status(200).json({
        success: false,
        message: 'License has expired',
        data: data
      });
    }

    // 计算剩余时间
    const remaining = data.expires_at - now;
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);

    return response.status(200).json({
      success: true,
      message: 'License is valid',
      data: {
        ...data,
        remaining_hours: hours,
        remaining_minutes: minutes,
        expires_at_readable: new Date(data.expires_at * 1000).toISOString()
      }
    });

  } catch (error) {
    console.error('验证错误:', error);
    return response.status(500).json({
      success: false,
      message: 'Verification error'
    });
  }
}

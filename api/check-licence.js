import { supabase } from '../../utils/supabase.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { licenseKey, deviceId } = req.body
    
    if (!licenseKey) {
      return res.status(400).json({ 
        error: 'Missing license key' 
      })
    }

    // 1. 查找卡密
    const { data: license, error: fetchError } = await supabase
      .from('licenses')
      .select('*')
      .eq('license_key', licenseKey)
      .single()

    if (fetchError || !license) {
      return res.status(404).json({ 
        error: 'License not found' 
      })
    }

    // 2. 检查状态
    if (license.status !== 'active') {
      return res.status(403).json({ 
        error: `License is ${license.status}` 
      })
    }

    // 3. 检查是否过期
    const now = new Date()
    const expiresAt = new Date(license.expires_at)
    
    if (now > expiresAt) {
      // 更新状态为过期
      await supabase
        .from('licenses')
        .update({ status: 'expired' })
        .eq('id', license.id)
      
      return res.status(403).json({ 
        error: 'License has expired' 
      })
    }

    // 4. 记录使用历史
    if (deviceId) {
      // 记录使用信息
      await supabase
        .from('license_usage')
        .insert([{
          license_id: license.id,
          device_info: { device_id: deviceId },
          ip_address: req.headers['x-forwarded-for'] || req.connection.remoteAddress
        }])

      // 更新最后使用时间
      await supabase
        .from('licenses')
        .update({ last_used: now.toISOString() })
        .eq('id', license.id)
    }

    // 5. 返回验证成功
    return res.status(200).json({
      success: true,
      license: {
        key: license.license_key,
        user_id: license.user_id,
        expires_at: license.expires_at,
        days_remaining: Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24))
      },
      message: 'License is valid'
    })

  } catch (error) {
    console.error('Check license error:', error)
    return res.status(500).json({ 
      error: 'Internal server error' 
    })
  }
}

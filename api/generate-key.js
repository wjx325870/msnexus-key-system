import { supabase } from '../../utils/supabase.js'

export default async function handler(req, res) {
  // 只允许POST请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId, deviceId } = req.body
    
    // 1. 验证输入
    if (!userId || !deviceId) {
      return res.status(400).json({ 
        error: 'Missing userId or deviceId' 
      })
    }

    // 2. 检查用户是否已有有效卡密
    const { data: existingLicenses, error: checkError } = await supabase
      .from('licenses')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .limit(1)

    if (checkError) throw checkError

    // 3. 如果已有有效卡密，返回现有卡密
    if (existingLicenses && existingLicenses.length > 0) {
      return res.status(200).json({
        success: true,
        message: 'You already have an active license',
        license: existingLicenses[0].license_key,
        expires_at: existingLicenses[0].expires_at,
        existing: true
      })
    }

    // 4. 生成新的卡密
    const licenseKey = `MSN-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    
    // 5. 计算过期时间（30天后）
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    // 6. 插入数据库
    const { data: newLicense, error: insertError } = await supabase
      .from('licenses')
      .insert([{
        license_key: licenseKey,
        user_id: userId,
        device_id: deviceId,
        status: 'active',
        expires_at: expiresAt.toISOString()
      }])
      .select()
      .single()

    if (insertError) throw insertError

    // 7. 返回生成的卡密
    return res.status(201).json({
      success: true,
      license: licenseKey,
      expires_at: expiresAt.toISOString(),
      message: 'License generated successfully'
    })

  } catch (error) {
    console.error('Generate key error:', error)
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    })
  }
}

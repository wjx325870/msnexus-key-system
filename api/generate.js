// 在内存中存储卡密（重启会丢失，但最简单）
let allKeys = [];

export default async function handler(request, response) {
  // 设置CORS
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Content-Type', 'application/json');

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

    // 2. 设置过期时间
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + (23 * 60 * 60);

    // 3. 保存到内存
    const keyData = {
      licenseKey: key,
      expiresAt: expiresAt,
      expiresAtReadable: new Date(expiresAt * 1000).toISOString(),
      generatedAt: new Date().toISOString(),
      status: 'active',
      id: Date.now() // 简单ID
    };
    
    allKeys.push(keyData);
    
    // 只保留最近的100个卡密（防止内存占用过大）
    if (allKeys.length > 100) {
      allKeys = allKeys.slice(-100);
    }

    // 4. 返回成功响应
    return response.status(200).json({
      success: true,
      message: 'License key generated and saved',
      data: {
        currentKey: keyData,
        totalKeys: allKeys.length,
        allKeys: allKeys // 返回所有卡密
      }
    });

  } catch (error) {
    console.error('Error:', error);
    return response.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

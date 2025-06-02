import { NextRouter } from 'next/router';

// 👇 核心逻辑：自动判断权限并跳转
export async function checkMicPermissionAndNavigate(router: NextRouter) {
  // 如果浏览器支持 Permissions API
  if (navigator.permissions) {
    try {
      const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });

      if (status.state === 'granted') {
        // ✅ 已授权，直接跳转
        console.log('✅ 麦克风权限已授权');
        router.push('/whisperer');
        return;
      }

      if (status.state === 'denied') {
        // ❌ 永久拒绝，跳转提示页面
        console.warn('❌ 麦克风权限被拒');
        router.push('/permission-denied');
        return;
      }

      // ❓ prompt 状态：发起请求
      await requestMicAndRedirect(router);
    } catch (err) {
      console.error('📛 无法判断麦克风权限:', err);
      await requestMicAndRedirect(router);
    }
  } else {
    // Fallback：直接请求
    await requestMicAndRedirect(router);
  }
}

async function requestMicAndRedirect(router: NextRouter) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    router.push('/whisperer');
  } catch (err) {
    console.error('❌ 获取麦克风权限失败:', err);
    router.push('/permission-denied');
  }
}

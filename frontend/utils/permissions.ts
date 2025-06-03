import { NextRouter } from 'next/router';

/**
 * 👇 核心逻辑：自动判断麦克风权限 + 控制跳转
 * @param router Next.js 路由对象
 * @param setLoading 可选，用于显示加载动画的状态控制器
 */
export async function checkMicPermissionAndNavigate(
  router: NextRouter,
  setLoading?: (val: boolean) => void
) {
  if (navigator.permissions) {
    try {
      setLoading?.(true); // ⏳ 显示加载动画

      const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });

      if (status.state === 'granted') {
        console.log('✅ 麦克风权限已授权');
        await delay(300); // ⏳ 给设备准备一点时间
        router.push('/whisperer');
        return;
      }

      if (status.state === 'denied') {
        console.warn('❌ 麦克风权限被拒');
        router.push('/permission-denied');
        return;
      }

      // ❓ prompt 状态（尚未决定），触发真实请求
      await requestMicAndRedirect(router, setLoading);
    } catch (err) {
      console.error('📛 无法判断麦克风权限:', err);
      await requestMicAndRedirect(router, setLoading);
    } finally {
      setLoading?.(false);
    }
  } else {
    // Fallback：直接尝试
    await requestMicAndRedirect(router, setLoading);
  }
}

async function requestMicAndRedirect(
  router: NextRouter,
  setLoading?: (val: boolean) => void
) {
  try {
    setLoading?.(true);
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        channelCount: 1,
      },
      video: false,
    });

    console.log('[🎙️] 麦克风已连接');
    stream.getTracks().forEach((track) => track.stop());

    await delay(300); // ⏳ 稳定一下再跳转（避免 UI 抢跑）
    router.push('/whisperer');
  } catch (err) {
    console.error('❌ 获取麦克风权限失败:', err);
    router.push('/permission-denied');
  } finally {
    setLoading?.(false);
  }
}

// 可选：稍作延迟，让系统有时间连接麦克风设备
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

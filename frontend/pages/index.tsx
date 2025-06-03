import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { Menu } from 'lucide-react';
import SideMenu from '../components/SideMenu';
import { checkMicPermissionAndNavigate } from '../utils/permissions';

export default function HomePage() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // ✅ 新增 loading 状态

  const handleStart = () => {
    checkMicPermissionAndNavigate(router, setIsLoading); // ✅ 传入 setLoading
  };

  return (
    <div style={styles.container}>
      <div style={styles.navbar}>
        <span style={styles.title}>Whisperer</span>
        <Menu
          size={28}
          color="#fff"
          style={styles.menuIcon}
          onClick={() => setMenuOpen(true)}
        />
      </div>

      <div style={styles.centerArea}>
        {isLoading ? (
          <p style={{ color: 'white', fontSize: 18 }}>🎧 正在准备麦克风，请稍候...</p>
        ) : (
          <div style={styles.circleWrapper} onClick={handleStart}>
            <div style={styles.glow}></div>
            <div style={styles.circle}></div>
          </div>
        )}
      </div>

      {menuOpen && <SideMenu onClose={() => setMenuOpen(false)} />}
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: '#0d0c0f',
    height: '100vh',
    width: '100vw',
    position: 'relative' as const,
    fontFamily: 'sans-serif',
  },
  navbar: {
    position: 'absolute' as const,
    top: 20,
    left: 20,
    right: 20,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: 'white',
    padding: '0 20px',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold' as const,
  },
  menuIcon: {
    cursor: 'pointer',
  },
  centerArea: {
    height: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleWrapper: {
    width: 380,
    height: 380,
    overflow: 'hidden' as const,
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
    position: 'relative' as const,
  },
  glow: {
    position: 'absolute' as const,
    width: 600,
    height: 600,
    borderRadius: '50%',
    backgroundImage: 'url("/assets/whisperer-glow.png")',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    zIndex: 0,
  },
  circle: {
    width: 500,
    height: 500,
    backgroundImage: 'url("/assets/whisperer-circle.png")',
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    zIndex: 1,
  },
};

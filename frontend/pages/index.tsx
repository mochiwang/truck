import React from 'react';
import { useRouter } from 'next/router';
import { Menu } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();

  const handleStart = () => {
    router.push('/whisperer');
  };

  const handleMenu = () => {
    router.push('/menu');
  };

  return (
    <div style={styles.container}>
      <div style={styles.navbar}>
        <span style={styles.title}>Whisperer</span>
        <Menu size={28} color="#fff" style={styles.menuIcon} onClick={handleMenu} />
      </div>

      <div style={styles.centerArea}>
        <div style={styles.circle} onClick={handleStart}></div>
      </div>
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
  circle: {
    width: 400,
    height: 400,
    borderRadius: '50%',
    backgroundImage: 'url("/assets/whisperer-circle.png")',
    backgroundSize: 'contain', // ✅ 保持图形完整显示
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    cursor: 'pointer',
    boxShadow: '0 0 60px rgba(255, 215, 100, 0.4)',
  },
};

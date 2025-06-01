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
        <div style={styles.circle} onClick={handleStart}>
          <span style={styles.circleText}>启动</span>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#0d0c0f',
    height: '100vh',
    width: '100vw',
    position: 'relative',
    fontFamily: 'sans-serif',
  },
  navbar: {
    position: 'absolute',
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
    fontWeight: 'bold',
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
    width: 220,
    height: 220,
    borderRadius: '50%',
    backgroundImage: 'url("/assets/whisperer-circle.png")',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    cursor: 'pointer',
    boxShadow: '0 0 30px rgba(255, 215, 100, 0.4)',
  },
  circleText: {
    display: 'none',
  },
};

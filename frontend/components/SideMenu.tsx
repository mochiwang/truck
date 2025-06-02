import Link from 'next/link';
import React from 'react';

export default function SideMenu({ onClose }: { onClose: () => void }) {
  return (
    <div className="fullscreen-menu-container" onClick={onClose}>
      <div className="fullscreen-menu-content" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ color: '#fff', fontSize: '1.6rem', marginBottom: '2rem' }}>功能菜单</h2>

        <MenuItem text="🗂 固定句子训练" href="/fixed" onClose={onClose} delay={0.1} />
        <MenuItem text="💬 自由输入练习" href="/freeTalk" onClose={onClose} delay={0.2} />
        <MenuItem text="🎙️ 场景式对话" href="/scenario" onClose={onClose} delay={0.3} />
        <MenuItem text="🎧 熟悉警察常用对话" href="/sceneLoop" onClose={onClose} delay={0.4} />
        <MenuItem text="🧪 场景挑战" href="/scenarioChallenge" onClose={onClose} delay={0.5} />

        <button
          onClick={onClose}
          style={{
            marginTop: '3rem',
            background: 'none',
            border: '2px solid white',
            borderRadius: '10px',
            color: 'white',
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            cursor: 'pointer',
          }}
        >
          × 关闭菜单
        </button>
      </div>
    </div>
  );
}

function MenuItem({
  text,
  href,
  onClose,
  delay = 0,
}: {
  text: string;
  href: string;
  onClose: () => void;
  delay?: number;
}) {
  return (
    <Link href={href}>
      <button
        className="fullscreen-menu-button fade-in"
        onClick={onClose}
        style={{ animationDelay: `${delay}s` }}
      >
        {text}
      </button>
    </Link>
  );
}

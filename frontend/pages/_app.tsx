// frontend/pages/_app.tsx
import '../styles/globals.css'; // ✅ 引入你写的全局 CSS
import type { AppProps } from 'next/app';

export default function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}

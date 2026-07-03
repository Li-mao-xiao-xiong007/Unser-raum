import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import '../styles/global.css';

function NavLink({ href, children }) {
  const router = useRouter();
  const isActive = router.pathname === href || 
    (href !== '/' && router.pathname.startsWith(href));

  return (
    <Link href={href} className={`nav-link ${isActive ? 'active' : ''}`}>
      {children}
    </Link>
  );
}

export default function App({ Component, pageProps }) {
  return (
    <div className="container">
      <nav className="nav">
        <NavLink href="/">🏠 空间</NavLink>
        <NavLink href="/messages">💬 留言</NavLink>
        <NavLink href="/memories">📦 记忆</NavLink>
        <NavLink href="/letters">💌 信件</NavLink>
        <NavLink href="/decoder">🔮 拆信</NavLink>
      </nav>
      <Component {...pageProps} />
    </div>
  );
}

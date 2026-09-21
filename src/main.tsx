import React, { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

// Keep existing shared case links working after the app moves to /app.
if (location.pathname === '/' && new URLSearchParams(location.search).has('case')) {
  history.replaceState({}, '', `/app${location.search}${location.hash}`);
}
const isApp = location.pathname === '/app' || location.pathname === '/app/';
const Page = lazy(isApp ? () => import('./App') : () => import('./Landing'));
createRoot(document.getElementById('root')!).render(
  <React.StrictMode><Suspense fallback={<div className="route-loading" role="status">MintTrace<span> ···</span></div>}><Page/></Suspense></React.StrictMode>,
);

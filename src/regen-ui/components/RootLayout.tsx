import { Outlet, useLocation } from 'react-router';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import DebugPanel from './DebugPanel';

// Routes that render an immersive full-bleed map get no scroll padding.
const fullBleed = ['/explore', '/find-land', '/business'];

export default function RootLayout() {
  const { pathname } = useLocation();
  const immersive = fullBleed.some((p) => pathname === p || pathname.startsWith(p + '/'));

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className={`flex-1 overflow-y-auto ${immersive ? '' : 'px-5 pb-8'}`}>
          <Outlet />
        </main>
      </div>
      <DebugPanel />
    </div>
  );
}

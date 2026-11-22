import { useEffect } from 'react';
import { useRef } from 'react';
import { Outlet, useLocation, useNavigationType } from 'react-router-dom';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import ReceptionReturnBar from './ReceptionReturnBar.jsx';
import HashScroll from './HashScroll.jsx';
import { Cursor, PageProgress, RouteSweep } from './motion.jsx';
import { setOrigin } from '../lib/entryOrigin.js';
import { visitor } from '../reception/conversation.js';
const pageKey = (p) => (p === '/' ? 'home' : p === '/studio' ? 'about' : /^\/projects\/./.test(p) ? 'project' : /^\/services\/./.test(p) ? 'service' : /^\/journal\/./.test(p) ? 'article' : p.split('/')[1] || 'home');
export default function Layout() {
  const { pathname } = useLocation();
  const navType = useNavigationType();
  const navTypeRef = useRef(navType);
  useEffect(() => { navTypeRef.current = navType; });   // latest type, read by the scroll effect below without re-running it
  useEffect(() => { if (navTypeRef.current !== 'POP') window.scrollTo(0, 0);   /* Back/Forward: NavTracker restores the saved position */ if (pathname === '/') setOrigin('home'); document.documentElement.dataset.page = pageKey(pathname); visitor.noteRoute(pathname); }, [pathname]);   // lightweight session memory for the receptionist
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <PageProgress /><RouteSweep /><Cursor /><HashScroll />
      <Header />
      <ReceptionReturnBar />
      <main id="main" className="page" key={pathname} tabIndex={-1}><Outlet /></main>
      <Footer />
    </>
  );
}

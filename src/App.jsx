import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import IntroSplash from './components/IntroSplash.jsx';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Studio from './pages/Studio.jsx';
import Projects from './pages/Projects.jsx';
import ProjectDetail from './pages/ProjectDetail.jsx';
import Services from './pages/Services.jsx';
import ServiceDetail from './pages/ServiceDetail.jsx';
import Process from './pages/Process.jsx';
import Team from './pages/Team.jsx';
import Journal from './pages/Journal.jsx';
import Article from './pages/Article.jsx';
import Contact from './pages/Contact.jsx';
import NotFound from './pages/NotFound.jsx';

const ReceptionPage = lazy(() => import('./reception/ReceptionPage.jsx'));   // 3D code is a separate chunk
const Loading = () => <div style={{ position: 'fixed', inset: 0, background: '#141312' }} aria-label="Loading" />;

export default function App() {
  return (
    <>
      <IntroSplash />
      <Routes>
        <Route path="/reception" element={<Suspense fallback={<Loading />}><ReceptionPage /></Suspense>} />
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="studio" element={<Studio />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/:slug" element={<ProjectDetail />} />
          <Route path="services" element={<Services />} />
          <Route path="services/:slug" element={<ServiceDetail />} />
          <Route path="process" element={<Process />} />
          <Route path="team" element={<Team />} />
          <Route path="journal" element={<Journal />} />
          <Route path="journal/:slug" element={<Article />} />
          <Route path="contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      <Analytics />
    </>
  );
}

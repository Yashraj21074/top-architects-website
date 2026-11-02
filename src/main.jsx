import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/pages.css';
import './styles/motion.css';
import './styles/studio.css';
import './styles/intro-splash.css';
import './styles/journal.css';
import './styles/process.css';
import './styles/project-marquee.css';
import App from './App.jsx';
import { startThemeWatcher } from './lib/theme.js';
import { initOrigin } from './lib/entryOrigin.js';

initOrigin(location.pathname);
startThemeWatcher();
createRoot(document.getElementById('root')).render(<BrowserRouter><App /></BrowserRouter>);

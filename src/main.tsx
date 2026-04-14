import './lib/sentry'; // Must be first import — initializes error tracking
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// ─── Analytics ───
import { initPostHog } from './lib/posthog';
import { analytics } from './lib/analytics';
initPostHog();
analytics.init();
// ─────────────────

createRoot(document.getElementById("root")!).render(<App />);
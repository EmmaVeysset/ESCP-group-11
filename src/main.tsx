import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

function App() {
  return (
    <main>
      <p className="eyebrow">LUMEN · Germany market entry</p>
      <h1>Decision Cockpit</h1>
      <p>Foundation is ready. Scenario modeling and decision views arrive in the next pull requests.</p>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

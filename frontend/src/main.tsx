import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles/index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Nexonic IPTV v2: the page has no #root element. Rebuild the web app (npm run build).');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

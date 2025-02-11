import React from 'react';
import ReactDOM from 'react-dom/client';
import IntroPanel from './components/IntroPanel';
import RiskParametersPanel from './components/RiskParameters';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <React.StrictMode>
    <IntroPanel />
    <RiskParametersPanel />
  </React.StrictMode>
);

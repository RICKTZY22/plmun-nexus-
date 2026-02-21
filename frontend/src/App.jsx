import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes';
import ThemeProvider from './components/ThemeProvider';
import './index.css';

const App = () => {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;

import React, { useEffect } from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css';
import 'semantic-ui-css/semantic.min.css';
import { ThemeProvider } from './contexts/ThemeContext';
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';
import Converter from './components/Converter/Converter';
import ReloadPrompt from './components/ReloadPrompt/ReloadPrompt';
import './App.css';

function App() {
  useEffect(() => {
    AOS.init({
      duration: 1000,
      once: true
    });
  }, []);

  return (
    <ThemeProvider>
      <div className="app-wrapper">
        <Header />
        <main className="main-content">
          <Converter />
          <ReloadPrompt />
        </main>
        <Footer />
      </div>
    </ThemeProvider>
  );
}

export default App;

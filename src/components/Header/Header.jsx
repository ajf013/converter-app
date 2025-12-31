import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Icon } from 'semantic-ui-react';
import { motion } from 'framer-motion';
import './Header.css';

const Header = () => {
    const { theme, toggleTheme } = useTheme();

    return (
        <header className="app-header">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="header-content"
            >
                <h1>Types of Converter</h1>
                <button onClick={toggleTheme} className="theme-toggle" aria-label="Toggle Theme">
                    {theme === 'light' ? <Icon name="moon" size="large" /> : <Icon name="sun" size="large" />}
                </button>
            </motion.div>
        </header>
    );
};

export default Header;

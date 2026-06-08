import React from 'react';
import { useTheme } from './ThemeContext';
import { Sun, Moon, Activity, Calendar, BarChart2, Info } from 'lucide-react';
import { motion } from 'framer-motion';

interface NavbarProps {
  activeTab: 'home' | 'history' | 'analytics' | 'about';
  setActiveTab: (tab: 'home' | 'history' | 'analytics' | 'about') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { id: 'home', label: 'Home', icon: Activity },
    { id: 'history', label: 'History', icon: Calendar },
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
    { id: 'about', label: 'About', icon: Info },
  ] as const;

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-border-custom bg-surface/80 backdrop-blur-md transition-colors duration-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo Section */}
          <div 
            className="flex cursor-pointer items-center space-x-2"
            onClick={() => setActiveTab('home')}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white shadow-sm transition-transform duration-300 hover:scale-105">
              <span className="font-sans text-xl font-bold tracking-tight">X</span>
            </div>
            <span className="font-sans text-xl font-semibold tracking-tight text-text-primary">
              XSpeed
            </span>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`relative flex items-center space-x-1.5 px-4 py-2 text-sm font-medium rounded-xl transition-colors duration-200 ${
                    isActive ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNavBackground"
                      className="absolute inset-0 bg-bg/80 border border-border-custom rounded-xl"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon className="relative z-10 h-4 w-4" />
                  <span className="relative z-10">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right Side: Theme Toggle & Mobile Menu Indicator */}
          <div className="flex items-center space-x-4">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-border-custom bg-surface hover:bg-bg/50 text-text-secondary hover:text-text-primary transition-all duration-200"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Links (Bottom bar style for neat mobile experience) */}
        <div className="flex md:hidden border-t border-border-custom py-1 justify-around items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center py-1.5 px-3 rounded-lg text-xs font-medium transition-colors duration-200 ${
                  isActive ? 'text-accent' : 'text-text-secondary'
                }`}
              >
                <Icon className="h-5 w-5 mb-0.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

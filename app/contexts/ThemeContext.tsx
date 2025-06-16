"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  // マウント状態を管理
  useEffect(() => {
    setMounted(true);
  }, []);

  // テーマをローカルストレージから読み込み（クライアントサイドのみ）
  useEffect(() => {
    if (!mounted) return;
    
    try {
      const savedTheme = localStorage.getItem('suna-theme') as Theme;
      if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
        setTheme(savedTheme);
      }
    } catch (error) {
      console.warn('Failed to load theme from localStorage:', error);
    }
  }, [mounted]);

  // システムテーマの変更を監視（クライアントサイドのみ）
  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;
    
    try {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const updateResolvedTheme = () => {
        if (theme === 'system') {
          setResolvedTheme(mediaQuery.matches ? 'dark' : 'light');
        } else {
          setResolvedTheme(theme as 'light' | 'dark');
        }
      };

      updateResolvedTheme();
      mediaQuery.addEventListener('change', updateResolvedTheme);

      return () => mediaQuery.removeEventListener('change', updateResolvedTheme);
    } catch (error) {
      console.warn('Failed to setup theme listener:', error);
      setResolvedTheme(theme as 'light' | 'dark');
    }
  }, [theme, mounted]);

  // テーマをHTMLクラスに適用（クライアントサイドのみ）
  useEffect(() => {
    if (!mounted || typeof document === 'undefined') return;
    
    try {
      const root = document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(resolvedTheme);
    } catch (error) {
      console.warn('Failed to apply theme to document:', error);
    }
  }, [resolvedTheme, mounted]);

  const handleSetTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    if (mounted) {
      try {
        localStorage.setItem('suna-theme', newTheme);
      } catch (error) {
        console.warn('Failed to save theme to localStorage:', error);
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleSetTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
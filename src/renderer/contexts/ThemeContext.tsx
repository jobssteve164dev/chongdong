import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ConfigProvider } from 'antd';
import { lightTheme, darkTheme, ThemeType } from '@/theme';

interface ThemeContextType {
  theme: ThemeType;
  toggleTheme: () => void;
  setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeType>('light');

  // 从本地存储加载主题设置
  useEffect(() => {
    const savedTheme = localStorage.getItem('chongdong-theme') as ThemeType;
    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
      setThemeState(savedTheme);
    }
  }, []);

  // 保存主题设置到本地存储
  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
    localStorage.setItem('chongdong-theme', newTheme);
    // 更新body类名以支持CSS主题切换
    document.body.className = newTheme === 'dark' ? 'dark' : '';
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  const themeConfig = theme === 'light' ? lightTheme : darkTheme;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      <ConfigProvider theme={themeConfig}>
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

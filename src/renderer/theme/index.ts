import type { ThemeConfig } from 'antd';
import { theme } from 'antd';

// 浅色主题配置
export const lightTheme: ThemeConfig = {
  token: {
    colorPrimary: '#1890ff',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    colorInfo: '#1890ff',
    borderRadius: 6,
    wireframe: false,
  },
  components: {
    Layout: {
      headerBg: '#ffffff',
      siderBg: '#fafafa',
      bodyBg: '#ffffff',
    },
    Menu: {
      itemBg: 'transparent',
      itemSelectedBg: '#e6f7ff',
      itemHoverBg: '#f5f5f5',
    },
    Card: {
      headerBg: '#fafafa',
      headerFontSize: 16,
      headerFontWeight: 600,
    },
    Button: {
      borderRadius: 6,
      controlHeight: 32,
    },
    Input: {
      borderRadius: 6,
      controlHeight: 32,
    },
    Select: {
      borderRadius: 6,
      controlHeight: 32,
    },
  },
};

// 深色主题配置
export const darkTheme: ThemeConfig = {
  token: {
    colorPrimary: '#1890ff',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    colorInfo: '#1890ff',
    borderRadius: 6,
    wireframe: false,
  },
  algorithm: theme.darkAlgorithm,
  components: {
    Layout: {
      headerBg: '#1f1f1f',
      siderBg: '#141414',
      bodyBg: '#000000',
    },
    Menu: {
      itemBg: 'transparent',
      itemSelectedBg: '#177ddc',
      itemHoverBg: '#1f1f1f',
    },
    Card: {
      headerBg: '#1f1f1f',
      headerFontSize: 16,
      headerFontWeight: 600,
    },
    Button: {
      borderRadius: 6,
      controlHeight: 32,
    },
    Input: {
      borderRadius: 6,
      controlHeight: 32,
    },
    Select: {
      borderRadius: 6,
      controlHeight: 32,
    },
  },
};

// 主题类型
export type ThemeType = 'light' | 'dark';

// 主题配置映射
export const themeConfigs: Record<ThemeType, ThemeConfig> = {
  light: lightTheme,
  dark: darkTheme,
};

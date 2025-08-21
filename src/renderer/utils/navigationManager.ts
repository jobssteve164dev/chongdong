import { create } from 'zustand';

export type PageKey = 'dashboard' | 'proxy' | 'subscription' | 'rules' | 'nodes' | 'monitor' | 'settings';

interface NavigationState {
  currentPage: PageKey;
  setCurrentPage: (page: PageKey) => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  currentPage: 'dashboard',
  setCurrentPage: (page: PageKey) => set({ currentPage: page }),
}));

// 页面导航管理器
export const navigationManager = {
  // 导航到指定页面
  navigateTo: (page: PageKey) => {
    useNavigationStore.getState().setCurrentPage(page);
  },
  
  // 获取当前页面
  getCurrentPage: (): PageKey => {
    return useNavigationStore.getState().currentPage;
  },
  
  // 导航到监控统计页面
  navigateToMonitor: () => {
    navigationManager.navigateTo('monitor');
  },
  
  // 导航到代理管理页面
  navigateToProxy: () => {
    navigationManager.navigateTo('proxy');
  },
  
  // 导航到订阅管理页面
  navigateToSubscription: () => {
    navigationManager.navigateTo('subscription');
  },
  
  // 导航到规则管理页面
  navigateToRules: () => {
    navigationManager.navigateTo('rules');
  },
  
  // 导航到设置页面
  navigateToSettings: () => {
    navigationManager.navigateTo('settings');
  },
};

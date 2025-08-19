// 代理协议类型
export enum ProxyProtocol {
  HTTP = 'http',
  HTTPS = 'https',
  SOCKS5 = 'socks5',
  SHADOWSOCKS = 'shadowsocks',
  VMESS = 'vmess',
  VLESS = 'vless',
  TROJAN = 'trojan',
  HYSTERIA = 'hysteria',
  TUIC = 'tuic',
  WIREGUARD = 'wireguard',
}

// 代理服务器配置
export interface ProxyServer {
  id: string;
  name: string;
  protocol: ProxyProtocol;
  host: string;
  port: number;
  username?: string;
  password?: string;
  encryption?: string;
  uuid?: string;
  alterId?: number;
  network?: string;
  wsPath?: string;
  wsHeaders?: Record<string, string>;
  tls?: boolean;
  sni?: string;
  alpn?: string[];
  fingerprint?: string;
  publicKey?: string;
  privateKey?: string;
  shortId?: string;
  mtu?: number;
  enabled: boolean;
  latency?: number;
  lastTest?: number;
}

// 代理组配置
export interface ProxyGroup {
  id: string;
  name: string;
  type: 'select' | 'url-test' | 'fallback' | 'load-balance';
  proxies: string[];
  url?: string;
  interval?: number;
  tolerance?: number;
  enabled: boolean;
}

// 订阅配置
export interface Subscription {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  autoUpdate: boolean;
  updateInterval: number;
  lastUpdate?: number;
  nextUpdate?: number;
  servers: ProxyServer[];
  groups: ProxyGroup[];
}

// 应用设置
export interface AppSettings {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  autoStart: boolean;
  systemProxy: boolean;
  proxyPort: number;
  socksPort: number;
  mixedPort: number;
  allowLan: boolean;
  mode: 'rule' | 'global' | 'direct';
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  enableLog: boolean;
  logFile: string;
  enableUdp: boolean;
  enableIpv6: boolean;
  enableTun: boolean;
  tunDevice: string;
  enableFakeIp: boolean;
  fakeIpRange: string;
  enableDns: boolean;
  dnsServer: string;
  enableDoh: boolean;
  dohServer: string;
  proxyEngine: 'singbox' | 'xray' | 'clash';
  engineSettings: Record<string, any>;
  // 延迟测试设置
  latencyTestUrl: string;
  latencyTestTimeout: number;
  latencyTestRetries: number;
  latencyTestInterval: number;
  enableAutoLatencyTest: boolean;
  latencyTestConcurrency: number;
  latencyTestUrls: string;
  latencyTestValidityPeriod: number;
}

// 用户偏好设置
export interface UserPreferences {
  windowSize: { width: number; height: number };
  windowPosition: { x: number; y: number };
  sidebarCollapsed: boolean;
  autoHideMenuBar: boolean;
  alwaysOnTop: boolean;
  minimizeToTray: boolean;
  startMinimized: boolean;
  enableNotifications: boolean;
  notificationSound: boolean;
  enableHotkeys: boolean;
  hotkeys: Record<string, string>;
}

// 流量统计
export interface TrafficStats {
  upload: number;
  download: number;
  uploadSpeed: number;
  downloadSpeed: number;
  timestamp: number;
}

// 连接状态
export interface ConnectionStatus {
  connected: boolean;
  currentServer?: string;
  currentGroup?: string;
  startTime?: number;
  duration?: number;
  upload: number;
  download: number;
  uploadSpeed: number;
  downloadSpeed: number;
}

// 应用状态
export interface AppState {
  settings: AppSettings;
  preferences: UserPreferences;
  subscriptions: Subscription[];
  servers: ProxyServer[];
  groups: ProxyGroup[];
  connection: ConnectionStatus;
  traffic: TrafficStats;
}

// 事件类型
export enum AppEvent {
  SETTINGS_CHANGED = 'settings_changed',
  SUBSCRIPTION_UPDATED = 'subscription_updated',
  SERVER_ADDED = 'server_added',
  SERVER_REMOVED = 'server_removed',
  SERVER_UPDATED = 'server_updated',
  CONNECTION_CHANGED = 'connection_changed',
  TRAFFIC_UPDATED = 'traffic_updated',
  THEME_CHANGED = 'theme_changed',
  LANGUAGE_CHANGED = 'language_changed',
}

// 菜单事件
export enum MenuEvent {
  NEW_CONFIG = 'menu-new-config',
  IMPORT_CONFIG = 'menu-import-config',
  EXPORT_CONFIG = 'menu-export-config',
  ABOUT = 'menu-about',
  QUIT = 'menu-quit',
}

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 分页参数
export interface PaginationParams {
  page: number;
  pageSize: number;
  total?: number;
}

// 分页响应
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// 文件信息
export interface FileInfo {
  name: string;
  path: string;
  size: number;
  type: string;
  lastModified: number;
}

// 错误信息
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: number;
}

export interface ProxyNode {
  id: string;
  name: string;
  type: ProxyProtocol | string;
  server: string;
  port: number;
  // Extended properties for config generation
  uuid?: string;
  password?: string;
  security?: string;
  network?: string;
  wsPath?: string;
  wsHost?: string;
  // Add other simple properties needed for display or basic logic
}

export interface ChainConfig {
  id: string;
  name: string;
  description: string;
  proxies: string[];
  rules: any[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

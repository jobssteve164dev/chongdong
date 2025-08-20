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
  rules: RoutingRule[];
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
  // 新增DNS安全性和隐私性配置
  enableDot: boolean;
  dotServer: string;
  enableDnsCache: boolean;
  dnsCacheSize: number;
  dnsCacheTtl: number;
  enableDnsLoadBalance: boolean;
  dnsServers: string[];
  enableDnsLogging: boolean;
  enableDnsLeakProtection: boolean;
  dnsLeakProtectionMode: 'strict' | 'relaxed';
  enableDnsRules: boolean;
  dnsRules: DnsRule[];
  enableDnsFallback: boolean;
  dnsFallbackServers: string[];
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

// 新增DNS规则接口
export interface DnsRule {
  id: string;
  name: string;
  pattern: string;
  patternType: 'domain' | 'suffix' | 'keyword' | 'regex';
  action: 'direct' | 'proxy' | 'block' | 'custom';
  customServer?: string;
  enabled: boolean;
  priority: number;
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

// 规则类型枚举
export enum RuleType {
  DOMAIN = 'domain',
  DOMAIN_SUFFIX = 'domain_suffix',
  DOMAIN_KEYWORD = 'domain_keyword',
  DOMAIN_REGEX = 'domain_regex',
  IP_CIDR = 'ip_cidr',
  IP_CIDR6 = 'ip_cidr6',
  GEOIP = 'geoip',
  PROCESS = 'process',
  PROCESS_PATH = 'process_path',
  PROTOCOL = 'protocol',
  SCRIPT = 'script',
  MATCH = 'match'
}

// 规则动作枚举
export enum RuleAction {
  PROXY = 'proxy',
  DIRECT = 'direct',
  BLOCK = 'block',
  CHAIN = 'chain',
  REJECT = 'reject'
}

// 规则来源枚举
export enum RuleSource {
  USER = 'user',
  SUBSCRIPTION = 'subscription',
  SYSTEM = 'system',
  TEMPLATE = 'template'
}

// 路由规则接口
export interface RoutingRule {
  id: string;
  name: string;
  type: RuleType;
  value: string | string[];
  action: RuleAction;
  target?: string; // 当action为proxy或chain时，指定使用的代理或代理链ID
  priority: number;
  source: RuleSource;
  enabled: boolean;
  description?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  // 高级选项
  invert?: boolean; // 是否反转匹配
  network?: string; // 网络类型过滤
  sourcePort?: number | string; // 源端口
  destinationPort?: number | string; // 目标端口
  user?: string; // 用户过滤
  inboundTag?: string[]; // 入站标签
  protocol?: string[]; // 协议过滤
  domain?: string[]; // 域名过滤
  ip?: string[]; // IP过滤
  port?: number | string; // 端口过滤
  sourceIp?: string[]; // 源IP过滤
  ipVersion?: number; // IP版本
  clashRule?: string; // Clash原始规则字符串
}

// 规则组接口
export interface RuleGroup {
  id: string;
  name: string;
  description?: string;
  rules: RoutingRule[];
  enabled: boolean;
  priority: number;
  source: RuleSource;
  createdAt: Date;
  updatedAt: Date;
}

// 规则模板接口
export interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  rules: Omit<RoutingRule, 'id' | 'createdAt' | 'updatedAt'>[];
  tags: string[];
  version: string;
  author?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 规则解析结果接口
export interface RuleParseResult {
  rules: RoutingRule[];
  groups: RuleGroup[];
  error?: string;
  warnings?: string[];
  metadata?: {
    totalRules: number;
    totalGroups: number;
    format: string;
    version?: string;
  };
}

// 规则冲突检测结果接口
export interface RuleConflictResult {
  conflicts: Array<{
    rule1: RoutingRule;
    rule2: RoutingRule;
    type: 'duplicate' | 'overlap' | 'contradictory';
    description: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  suggestions: string[];
}

// 规则匹配结果接口
export interface RuleMatchResult {
  matched: boolean;
  rule?: RoutingRule;
  action: RuleAction;
  target?: string;
  latency?: number;
  error?: string;
}

// 规则统计信息接口
export interface RuleStats {
  totalRules: number;
  enabledRules: number;
  disabledRules: number;
  rulesByType: Record<RuleType, number>;
  rulesByAction: Record<RuleAction, number>;
  rulesBySource: Record<RuleSource, number>;
  topMatchedRules: Array<{
    rule: RoutingRule;
    matchCount: number;
    lastMatched?: Date;
  }>;
  recentActivity: Array<{
    action: 'create' | 'update' | 'delete' | 'enable' | 'disable';
    rule: RoutingRule;
    timestamp: Date;
  }>;
}

// 分流规则组接口
export interface TrafficRuleGroup {
  id: string;
  name: string;
  description?: string;
  defaultProxy?: string; // 默认代理节点ID
  rules: RoutingRule[];
  enabled: boolean;
  source: RuleSource;
  priority: number;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  // 高级选项
  autoUpdate?: boolean; // 是否自动更新规则
  updateInterval?: number; // 更新间隔（分钟）
  lastUpdate?: number; // 最后更新时间
}

// 分流规则模板接口
export interface TrafficRuleTemplate {
  id: string;
  name: string;
  description: string;
  category: 'social' | 'streaming' | 'gaming' | 'work' | 'education' | 'shopping' | 'custom';
  rules: Omit<RoutingRule, 'id' | 'createdAt' | 'updatedAt'>[];
  defaultProxy?: string;
  tags?: string[];
  icon?: string;
  color?: string;
}

// 分流规则解析结果
export interface TrafficRuleParseResult {
  success: boolean;
  groups: TrafficRuleGroup[];
  errors?: string[];
  warnings?: string[];
  totalRules: number;
  totalGroups: number;
}

// 分流规则统计
export interface TrafficRuleStats {
  totalGroups: number;
  enabledGroups: number;
  disabledGroups: number;
  totalRules: number;
  enabledRules: number;
  disabledRules: number;
  groupsByCategory: Record<string, number>;
  rulesByType: Record<RuleType, number>;
  rulesByAction: Record<RuleAction, number>;
  averageRulesPerGroup: number;
  mostUsedProxies: Array<{ proxyId: string; count: number }>;
}

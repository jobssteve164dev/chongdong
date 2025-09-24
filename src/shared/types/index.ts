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
  isCustom?: boolean; // 标识是否为自定义服务器
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
  v2rayPath: string;
  clashPath: string;
  singBoxPath: string;
  theme: 'light' | 'dark' | 'system' | 'auto'; // 添加 'auto' 以保持兼容性
  language?: string; // 添加可选的 language 属性
  autoStart: boolean;
  systemProxy: boolean;
  subscriptions?: Subscription[]; // 添加可选的订阅列表
  proxyPort: number;
  socksPort: number;
  mixedPort: number;
  allowLan: boolean;
  mode: 'rule' | 'global' | 'direct' | 'vpn';
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
  dnsListenPort?: number; // DNS服务监听端口
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
  dnsLeakStrict: boolean; // 新增：严格模式开关
  // IPv6泄露防护
  enableIpv6LeakProtection: boolean;
  ipv6LeakProtectionMode: 'strict' | 'relaxed';
  // WebRTC泄露防护
  enableWebRTCLeakProtection: boolean;
  webRTCLeakProtectionMode: 'strict' | 'relaxed';
  webRTCAllowedDomains: string[];
  // 局域网隔离
  enableLanIsolation?: boolean;
  lanAllowedCidrs?: string[];
  // 行为混淆与分析
  enableTrafficDecoy?: boolean;
  decoyIntensity?: 'low' | 'medium' | 'high';
  customDecoyDomains?: string[];
  enableBehaviorAnalytics?: boolean;
  behaviorSamplingIntervalSec?: number;
  // 新增高级泄露防护配置
  enableTlsFingerprintProtection?: boolean;
  tlsFingerprintMode?: 'strict' | 'relaxed';
  tlsFingerprintTemplate?: 'chrome' | 'firefox' | 'safari' | 'edge' | 'custom';
  enableHttpHeaderProtection?: boolean;
  httpHeaderProtectionMode?: 'strict' | 'relaxed';
  customUserAgent?: string;
  enableTimingLeakProtection?: boolean;
  timingLeakProtectionMode?: 'strict' | 'relaxed';
  requestDelayRange?: [number, number]; // [min, max] milliseconds
  enableMacAddressProtection?: boolean;
  macAddressProtectionMode?: 'strict' | 'relaxed';
  // HTTP/2.0特定防护配置
  enableHttp2Protection?: boolean;
  http2ProtectionMode?: 'strict' | 'relaxed';
  http2ConnectionIsolation?: boolean;
  http2HeaderTableCleanup?: boolean;
  http2TimingObfuscation?: boolean;
  http2SensitiveDomains?: string[];
  http2ProtocolWhitelist?: string[];
  http2ForceHttp1?: boolean;
  http2BatchRequests?: boolean;
  http2BatchSize?: number;
  http2BatchDelayRange?: [number, number];
  http2ConnectionResetInterval?: number;
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
  // 兼容性代理
  enableCompatProxy?: boolean;
  compatHttpPort?: number; // 默认 1080 可用于 HTTP 兼容
  compatSocksPort?: number; // 默认 1080 可用于 SOCKS 兼容
  // 数据库自动更新设置
  enableDatabaseAutoUpdate?: boolean;
  databaseUpdateInterval?: number; // 更新间隔（小时），默认24小时
  databaseUpdateCheckOnStartup?: boolean; // 启动时检查更新
  databaseLastUpdateCheck?: number; // 最后检查时间戳
  // CF Edge 中间加密出站（按需启用）
  enableCfEdgeEgress?: boolean;
  cfEdgeMode?: 'pages' | 'workers';
  cfEdgeEndpoint?: string; // 例如 https://edge.example.com
  cfEdgePSKId?: string; // 预共享密钥ID（便于轮换）
  cfEdgePSK?: string; // 预共享密钥（加密传输用）
  cfEdgePolicy?: 'global' | 'non_mainland' | 'allowlist' | 'denylist';
  cfEdgeDomainAllowlist?: string[]; // 命中才走Edge
  cfEdgeDomainDenylist?: string[]; // 命中则不走Edge
}

export interface NetworkSettings {
  listenPort?: number;
  enableDns?: boolean;
  dnsServer?: string;
  enableDoh?: boolean;
  dohServer?: string;
  enableDot?: boolean;
  dotServer?: string;
  enableDnsCache?: boolean;
  dnsCacheSize?: number;
  dnsCacheTtl?: number;
  enableDnsLoadBalance?: boolean;
  dnsServers?: string[];
  enableDnsLogging?: boolean;
  enableDnsLeakProtection?: boolean;
  dnsLeakProtectionMode?: 'strict' | 'relaxed';
  enableDnsRules?: boolean;
  dnsRules?: DnsRule[];
  enableDnsFallback?: boolean;
  dnsFallbackServers?: string[];
  enableTun?: boolean;
  tunDevice?: string;
  enableFakeIp?: boolean;
  fakeIpRange?: string;
  enableUdp?: boolean;
  enableIpv6?: boolean;
  // 新增IPv6泄露防护配置
  enableIpv6LeakProtection?: boolean;
  ipv6LeakProtectionMode?: 'strict' | 'relaxed';
  // 新增WebRTC泄露防护配置
  enableWebRTCLeakProtection?: boolean;
  webRTCLeakProtectionMode?: 'strict' | 'relaxed';
  webRTCAllowedDomains?: string[];
  // 新增高级泄露防护配置
  enableTlsFingerprintProtection?: boolean;
  tlsFingerprintMode?: 'strict' | 'relaxed';
  tlsFingerprintTemplate?: 'chrome' | 'firefox' | 'safari' | 'edge' | 'custom';
  enableHttpHeaderProtection?: boolean;
  httpHeaderProtectionMode?: 'strict' | 'relaxed';
  customUserAgent?: string;
  enableTimingLeakProtection?: boolean;
  timingLeakProtectionMode?: 'strict' | 'relaxed';
  requestDelayRange?: [number, number]; // [min, max] milliseconds
  enableMacAddressProtection?: boolean;
  macAddressProtectionMode?: 'strict' | 'relaxed';
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  enableLog?: boolean;
  logFile?: string;
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

// DNS泄露检测结果接口
export interface DnsLeakResult {
  leaked: boolean;
  details: string[];
  leakSources: string[];
}

// IPv6泄露检测结果接口
export interface Ipv6LeakResult {
  leaked: boolean;
  details: string[];
  leakSources: string[];
  detectedIpv6Addresses: string[];
}

// WebRTC泄露检测结果接口
export interface WebRTCLeakResult {
  leaked: boolean;
  details: string[];
  leakSources: string[];
  detectedIPs: string[];
  stunServers: string[];
}

// TLS指纹泄露检测结果接口
export interface TlsFingerprintLeakResult {
  leaked: boolean;
  details: string[];
  leakSources: string[];
  detectedFingerprints: string[];
  currentFingerprint: string;
}

// HTTP头泄露检测结果接口
export interface HttpHeaderLeakResult {
  leaked: boolean;
  details: string[];
  leakSources: string[];
  detectedHeaders: { [key: string]: string };
  suspiciousHeaders: string[];
}

// 时间泄露检测结果接口
export interface TimingLeakResult {
  leaked: boolean;
  details: string[];
  leakSources: string[];
  timingPatterns: string[];
  requestIntervals: number[];
}

// MAC地址泄露检测结果接口
export interface MacAddressLeakResult {
  leaked: boolean;
  details: string[];
  leakSources: string[];
  detectedMacAddresses: string[];
  networkInterfaces: string[];
}

// HTTP/2.0防护检测结果接口
export interface Http2ProtectionResult {
  leaked: boolean;
  details: string[];
  leakSources: string[];
  connectionIsolation: boolean;
  headerTableCleanup: boolean;
  timingObfuscation: boolean;
  protocolDowngrade: boolean;
  sensitiveDomains: string[];
  connectionStats: {
    totalConnections: number;
    http1Connections: number;
    http2Connections: number;
    isolatedConnections: number;
    activePools: number;
  };
}

// 统一泄露防护状态接口
export interface LeakProtectionStatus {
  dns: {
    enabled: boolean;
    mode: 'strict' | 'relaxed';
    lastCheck?: Date;
    lastResult?: DnsLeakResult;
  };
  ipv6: {
    enabled: boolean;
    mode: 'strict' | 'relaxed';
    lastCheck?: Date;
    lastResult?: Ipv6LeakResult;
  };
  webrtc: {
    enabled: boolean;
    mode: 'strict' | 'relaxed';
    lastCheck?: Date;
    lastResult?: WebRTCLeakResult;
  };
  tlsFingerprint: {
    enabled: boolean;
    mode: 'strict' | 'relaxed';
    lastCheck?: Date;
    lastResult?: TlsFingerprintLeakResult;
  };
  httpHeader: {
    enabled: boolean;
    mode: 'strict' | 'relaxed';
    lastCheck?: Date;
    lastResult?: HttpHeaderLeakResult;
  };
  timingLeak: {
    enabled: boolean;
    mode: 'strict' | 'relaxed';
    lastCheck?: Date;
    lastResult?: TimingLeakResult;
  };
  macAddress: {
    enabled: boolean;
    mode: 'strict' | 'relaxed';
    lastCheck?: Date;
    lastResult?: MacAddressLeakResult;
  };
  http2Protection: {
    enabled: boolean;
    mode: 'strict' | 'relaxed';
    lastCheck?: Date;
    lastResult?: Http2ProtectionResult;
  };
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
  type: ProxyProtocol;
  server: string;
  port: number;
  subscriptionId?: string; // 添加订阅ID字段，用于节点分组
  // Extended properties for config generation
  uuid?: string;
  alterId?: number; // vmess alterId
  username?: string; // for socks/http
  password?: string;
  encryption?: string;
  network?: string;
  wsPath?: string;
  wsHost?: string;
  // Add other simple properties needed for display or basic logic
}

export interface ChainConfig {
  id: string;
  name: string;
  description: string;
  type?: 'static' | 'dynamic'; // 新增：static为节点ID数组，dynamic为订阅ID数组
  proxies: string[]; // 可以是节点ID或订阅ID
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

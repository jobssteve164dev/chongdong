import { log, LogLevel } from './logger';

/**
 * 生成测试日志数据
 */
export const generateTestLogs = () => {
  // 清除现有日志
  log.clearLogs();

  // 生成不同级别的日志
  log.debug('调试信息：应用启动中', { component: 'App', version: '1.0.0' }, 'System');
  log.info('应用已成功启动', { uptime: Date.now() }, 'System');
  log.warn('检测到配置文件缺失，使用默认配置', { configFile: 'config.json' }, 'Config');
  log.error('网络连接失败', { url: 'https://api.example.com', status: 500 }, 'Network');

  // 生成更多测试日志
  log.info('用户登录成功', { userId: '12345', username: 'testuser' }, 'Auth');
  log.debug('正在验证用户权限', { permissions: ['read', 'write'] }, 'Auth');
  log.warn('用户权限不足', { requiredPermission: 'admin', userPermission: 'user' }, 'Auth');
  log.error('数据库连接超时', { database: 'main', timeout: 5000 }, 'Database');

  // 生成代理相关日志
  log.info('代理服务器启动', { port: 8080, protocol: 'http' }, 'Proxy');
  log.debug('代理规则加载完成', { ruleCount: 150 }, 'Proxy');
  log.warn('代理服务器负载较高', { cpuUsage: 85, memoryUsage: 70 }, 'Proxy');
  log.error('代理服务器崩溃', { error: 'Out of memory', stack: 'Error: Out of memory' }, 'Proxy');

  // 生成订阅相关日志
  log.info('订阅更新检查开始', { subscriptionId: 'sub_001' }, 'Subscription');
  log.debug('订阅数据解析中', { dataSize: '2.5MB' }, 'Subscription');
  log.warn('订阅数据格式不兼容', { expectedVersion: 'v2', actualVersion: 'v1' }, 'Subscription');
  log.error('订阅服务器不可用', { server: 'sub.example.com', status: 503 }, 'Subscription');

  // 生成规则相关日志
  log.info('规则引擎初始化', { engineType: 'regex' }, 'Rules');
  log.debug('规则编译完成', { compiledRules: 200 }, 'Rules');
  log.warn('规则冲突检测', { conflictingRules: ['rule1', 'rule2'] }, 'Rules');
  log.error('规则语法错误', { rule: 'invalid_rule', line: 45 }, 'Rules');

  // 生成节点相关日志
  log.info('节点健康检查开始', { nodeCount: 50 }, 'Nodes');
  log.debug('节点延迟测试', { avgLatency: 120 }, 'Nodes');
  log.warn('节点响应缓慢', { slowNodes: ['node1', 'node2'], avgLatency: 500 }, 'Nodes');
  log.error('节点连接失败', { node: 'node3', error: 'Connection refused' }, 'Nodes');

  // 生成监控相关日志
  log.info('监控数据收集完成', { metrics: ['cpu', 'memory', 'network'] }, 'Monitor');
  log.debug('性能指标计算', { calculationTime: 150 }, 'Monitor');
  log.warn('系统资源使用率过高', { cpu: 90, memory: 85, disk: 75 }, 'Monitor');
  log.error('监控服务异常', { service: 'metrics-collector', error: 'Service unavailable' }, 'Monitor');

  // 生成设置相关日志
  log.info('设置保存成功', { settings: ['theme', 'language', 'proxy'] }, 'Settings');
  log.debug('设置验证通过', { validationTime: 50 }, 'Settings');
  log.warn('设置项已过期', { deprecatedSettings: ['old_setting'] }, 'Settings');
  log.error('设置文件损坏', { file: 'settings.json', error: 'Invalid JSON' }, 'Settings');

  // 生成一些时间间隔的日志
  setTimeout(() => {
    log.info('定时任务执行', { task: 'cleanup', interval: '1h' }, 'Scheduler');
  }, 1000);

  setTimeout(() => {
    log.warn('定时任务延迟', { task: 'backup', delay: 5000 }, 'Scheduler');
  }, 2000);

  setTimeout(() => {
    log.error('定时任务失败', { task: 'sync', error: 'Network timeout' }, 'Scheduler');
  }, 3000);

  console.log('测试日志数据已生成');
};

/**
 * 持续生成日志数据（用于测试实时更新）
 */
export const startContinuousLogging = () => {
  const levels = [LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
  const categories = ['System', 'Network', 'Database', 'Proxy', 'Auth'];
  const messages = [
    '系统正常运行',
    '网络连接正常',
    '数据库查询完成',
    '代理请求处理',
    '用户认证成功',
    '配置更新完成',
    '缓存刷新',
    '内存清理',
    '日志轮转',
    '健康检查通过'
  ];

  const interval = setInterval(() => {
    const level = levels[Math.floor(Math.random() * levels.length)];
    const category = categories[Math.floor(Math.random() * categories.length)];
    const message = messages[Math.floor(Math.random() * messages.length)];
    
    log[level](message, { timestamp: Date.now(), random: Math.random() }, category);
  }, 3000); // 每3秒生成一条日志

  return () => clearInterval(interval);
};

/**
 * 生成特定时间范围的日志（用于测试时间筛选）
 */
export const generateTimeRangeLogs = () => {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  const twoHoursAgo = now - 2 * 60 * 60 * 1000;

  // 生成2小时前的日志
  const oldLog = {
    timestamp: twoHoursAgo,
    level: LogLevel.INFO,
    message: '这是2小时前的日志',
    data: { time: 'old' },
    category: 'History'
  };

  // 生成1小时前的日志
  const recentLog = {
    timestamp: oneHourAgo,
    level: LogLevel.WARN,
    message: '这是1小时前的日志',
    data: { time: 'recent' },
    category: 'History'
  };

  // 生成当前的日志
  const currentLog = {
    timestamp: now,
    level: LogLevel.ERROR,
    message: '这是当前的日志',
    data: { time: 'current' },
    category: 'History'
  };

  // 手动添加到日志系统（模拟历史日志）
  const existingLogs = JSON.parse(localStorage.getItem('chongdong_logs') || '[]');
  existingLogs.push(oldLog, recentLog, currentLog);
  localStorage.setItem('chongdong_logs', JSON.stringify(existingLogs));

  console.log('时间范围测试日志已生成');
};

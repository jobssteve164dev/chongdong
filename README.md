# 虫洞 (ChongDong) - 新一代跨平台代理客户端

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue.svg)](https://github.com/your-username/chongdong)
[![Electron](https://img.shields.io/badge/Electron-28.0.0-green.svg)](https://electronjs.org/)
[![React](https://img.shields.io/badge/React-18.0.0-blue.svg)](https://reactjs.org/)

## 📖 项目简介

虫洞 (ChongDong) 是一款现代化的跨平台代理客户端应用，专为用户提供高效、安全、易用的网络代理服务。应用采用 Electron + React + TypeScript 技术栈构建，支持 Windows、macOS 和 Linux 三大主流操作系统。

### 🌟 核心特性

- **🚀 跨平台支持**: 完美支持 Windows、macOS、Linux 系统
- **🎨 现代化界面**: 基于 React + Ant Design 的优雅用户界面
- **🌙 主题切换**: 支持深色/浅色主题，保护用户眼睛
- **🔗 多协议支持**: 集成 Clash、Xray、Sing-box 等主流代理协议
- **📡 订阅管理**: 支持订阅链接解析和自动更新
- **⛓️ 链式代理**: 可视化配置链式代理规则
- **📊 实时监控**: 流量统计和连接状态监控
- **💾 配置管理**: 支持配置导入/导出和备份/恢复
- **🔒 安全可靠**: 本地化处理，保护用户隐私

### 🛠️ 技术架构

```
┌─────────────────┐
│   GUI Layer     │  ← React + Electron
├─────────────────┤
│  Service Layer  │  ← Node.js Services
├─────────────────┤
│ Protocol Layer  │  ← Clash/Xray/Sing-box
├─────────────────┤
│  System Layer   │  ← OS Network APIs
└─────────────────┘
```

### 📋 功能模块

| 模块 | 功能描述 | 状态 |
|------|----------|------|
| 🖥️ GUI界面 | 用户界面和交互逻辑 | 🚧 开发中 |
| ⚙️ 配置管理 | 代理配置的存储和管理 | 📋 计划中 |
| 🔧 协议引擎 | 集成各种代理协议 | 📋 计划中 |
| 📡 订阅解析 | 处理订阅链接的解析和更新 | 📋 计划中 |
| 🌐 系统代理 | 设置系统级网络代理 | 📋 计划中 |
| 📊 监控统计 | 流量统计和连接监控 | 📋 计划中 |
| 📝 日志管理 | 应用日志和错误处理 | 📋 计划中 |

## 🚀 快速开始

### 系统要求

- **操作系统**: Windows 10+ / macOS 10.15+ / Ubuntu 18.04+
- **内存**: 最低 4GB RAM，推荐 8GB RAM
- **存储**: 至少 500MB 可用空间
- **网络**: 稳定的网络连接

### 安装方式

#### 方式一：下载预编译版本（推荐）

1. 访问 [Releases](https://github.com/your-username/chongdong/releases) 页面
2. 下载对应操作系统的安装包
3. 运行安装程序，按提示完成安装

#### 方式二：从源码构建

```bash
# 克隆项目
git clone https://github.com/your-username/chongdong.git
cd chongdong

# 安装依赖
npm install

# 开发模式运行
npm run dev

# 构建应用
npm run build

# 打包分发
npm run dist
```

### 使用指南

1. **首次启动**: 运行应用后，系统会引导您完成初始配置
2. **添加代理**: 在"代理管理"页面添加您的代理服务器配置
3. **导入订阅**: 在"订阅管理"页面导入您的订阅链接
4. **启动代理**: 点击"启动"按钮开始使用代理服务
5. **监控状态**: 在"监控"页面查看实时流量和连接状态

## 🛠️ 开发指南

### 环境准备

```bash
# 安装 Node.js (推荐 v18+)
node --version

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 项目结构

```
chongdong/
├── src/
│   ├── main/           # Electron 主进程
│   ├── renderer/       # React 渲染进程
│   └── shared/         # 共享代码和类型
├── public/             # 静态资源
├── dist/               # 构建输出
├── docs/               # 文档
└── tests/              # 测试文件
```

### 开发规范

- **代码风格**: 使用 ESLint + Prettier 进行代码格式化
- **类型检查**: 使用 TypeScript 进行类型安全开发
- **测试**: 使用 Jest 进行单元测试
- **提交规范**: 遵循 Conventional Commits 规范

### 构建和发布

```bash
# 开发构建
npm run build

# 生产构建
npm run build:prod

# 打包应用
npm run dist

# 运行测试
npm test

# 代码检查
npm run lint
```

## 📊 性能指标

| 指标 | 目标值 | 当前状态 |
|------|--------|----------|
| 启动时间 | < 5秒 | 🚧 开发中 |
| 内存占用 | < 200MB | 🚧 开发中 |
| CPU占用 | < 5% | 🚧 开发中 |
| 协议支持 | ≥ 5种 | 📋 计划中 |

## 🤝 贡献指南

我们欢迎所有形式的贡献！请查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解详细信息。

### 贡献方式

- 🐛 报告 Bug
- 💡 提出新功能建议
- 📝 改进文档
- 🔧 提交代码修复
- 🌟 分享使用经验

### 开发流程

1. Fork 项目到您的 GitHub 账户
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

感谢以下开源项目的支持：

- [Electron](https://electronjs.org/) - 跨平台桌面应用框架
- [React](https://reactjs.org/) - 用户界面库
- [Ant Design](https://ant.design/) - 企业级 UI 设计语言
- [Clash](https://github.com/Dreamacro/clash) - 代理工具
- [Xray](https://github.com/XTLS/Xray-core) - 网络代理工具
- [Sing-box](https://github.com/SagerNet/sing-box) - 通用代理工具

## 📞 联系我们

- **项目主页**: [https://github.com/your-username/chongdong](https://github.com/your-username/chongdong)
- **问题反馈**: [Issues](https://github.com/your-username/chongdong/issues)
- **讨论交流**: [Discussions](https://github.com/your-username/chongdong/discussions)
- **邮箱**: chongdong@example.com

## 📈 项目路线图

### v1.0.0 (当前版本)
- ✅ 基础框架搭建
- ✅ 现代化用户界面
- 🚧 核心功能实现
- 📋 协议集成
- 📋 系统代理设置

### v1.1.0 (计划中)
- 📋 订阅管理功能
- 📋 链式代理配置
- 📋 流量监控统计
- 📋 配置导入导出

### v1.2.0 (计划中)
- 📋 高级规则配置
- 📋 性能优化
- 📋 插件系统
- 📋 云端同步

---

**虫洞** - 让网络连接更简单、更安全、更高效！ 🌟

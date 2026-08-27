# 虫洞计划（ChongDong）

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue.svg)](https://github.com/jobssteve164dev/chongdong)
[![Electron](https://img.shields.io/badge/Electron-44-green.svg)](https://electronjs.org/)
[![React](https://img.shields.io/badge/React-18.0.0-blue.svg)](https://reactjs.org/)

## 📖 项目简介

虫洞计划是“堡垒计划”的内部组成部分，目标是建立内部可信的全链路七层网络信任机制。当前仓库提供桌面治理面、代理核心编排、静态/动态链路、系统流量接管、订阅与规则管理，以及基于真实观测证据的运行状态呈现。

本项目不是面向外部用户销售的通用代理客户端。历史 `plan report/` 与 `progress report/` 只保留过程信息，不能作为当前实现或安全结论的证据；当前能力以代码、测试和本文列出的验证命令为准。

## 可信结论边界

- 只有核心进程真实运行且入口可用时，界面才会显示已连接。
- “防护开关已启用”不等于“泄露检测通过”；缺少外部观测的项目显示为未验证。
- 严格 DNS 模式默认使用加密解析器；真实 DNS 出口仍需受控权威域名验证。
- 下载的代理核心与规则数据库使用固定版本和 SHA-256 清单校验。
- 系统代理只允许指向本机回环入口，渲染进程只能访问显式许可的 IPC 能力。

### 🌟 核心特性

- **🚀 跨平台构建**: 提供 Windows、macOS、Linux 打包配置；发布包仍需逐平台验收
- **🎨 现代化界面**: 基于 React + Ant Design 的优雅用户界面
- **🌙 主题切换**: 支持深色/浅色主题，保护用户眼睛
- **🔗 多协议支持**: 集成 Clash、Xray、Sing-box 等主流代理协议
- **📡 订阅管理**: 支持订阅链接解析和自动更新
- **⛓️ 链式代理**: 可视化配置链式代理规则
- **📊 实时监控**: 流量统计和连接状态监控
- **💾 配置管理**: 支持配置导入/导出和备份/恢复
- **🔒 可信状态**: 连接与检测结论必须绑定运行时或外部观测证据

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
| 🖥️ 治理界面 | 配置、连接、状态与检测入口 | 已实现，持续验收 |
| ⚙️ 配置管理 | 本地配置存储、导入与导出 | 已实现 |
| 🔧 协议核心 | Sing-box、Xray、Mihomo 编排 | 已实现，依赖外部核心 |
| 📡 订阅解析 | 订阅导入、解析和更新 | 已实现 |
| ⛓️ 链路机制 | 静态链与动态链运行 | 已实现基础闭环 |
| 🌐 系统接管 | 本机系统代理与部分 TUN/VPN 能力 | 平台能力不完全一致 |
| 📊 观测 | 运行状态、延迟与泄露风险 | 部分检查仍需外部观测环境 |

## 🚀 快速开始

### 系统要求

- **操作系统**: Windows 10+ / macOS 10.15+ / Ubuntu 18.04+
- **内存**: 最低 4GB RAM，推荐 8GB RAM
- **存储**: 至少 500MB 可用空间
- **网络**: 稳定的网络连接

### 从源码构建

```bash
# 克隆项目
git clone https://github.com/jobssteve164dev/chongdong.git
cd chongdong

# 安装依赖
npm ci

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
# 安装 Node.js（推荐 v20+）
node --version

# 安装依赖
npm ci

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
├── dist/               # 构建输出
├── docs/               # 文档
└── scripts/            # 运行时烟雾测试
```

### 开发规范

- **代码风格**: 使用 ESLint + Prettier 进行代码格式化
- **类型检查**: 使用 TypeScript 进行类型安全开发
- **测试**: 使用 Jest 进行单元测试
- **提交规范**: 遵循 Conventional Commits 规范

### 构建和发布

```bash
# 类型、代码与测试门禁
npm run type-check
npm run lint
npm test

# 生产构建
npm run build

# 打包应用
npm run dist

# 运行测试
npm test

# 代码检查
npm run lint
```

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
- [Mihomo](https://github.com/MetaCubeX/mihomo) - Clash 兼容代理核心
- [Xray](https://github.com/XTLS/Xray-core) - 网络代理工具
- [Sing-box](https://github.com/SagerNet/sing-box) - 通用代理工具

## 📞 联系我们

- **项目主页**: [https://github.com/jobssteve164dev/chongdong](https://github.com/jobssteve164dev/chongdong)
- **问题反馈**: [Issues](https://github.com/jobssteve164dev/chongdong/issues)

---

正式路线图由 SoloMap 管理；README 不复制或推断环节状态。

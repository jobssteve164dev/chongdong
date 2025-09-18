# 项目长期记忆 (PROJECT_MEMORY.md)

*最后更新: 2025-09-18 21:38:40*

---

## 1. 项目概述 (Project Overview)

### a. 核心目标 (High-Level Goal)
虫洞 (ChongDong) 是一款现代化的跨平台代理客户端应用，专为用户提供高效、安全、易用的网络代理服务。应用采用 Electron + React + TypeScript 技术栈构建，支持 Windows、macOS 和 Linux 三大主流操作系统，集成最新的 xray、singbox 等协议，支持订阅解析和链式代理配置。

### b. 技术栈 (Tech Stack)
*   **前端**: React 18.0.0 + TypeScript + Ant Design 5.0.0
*   **桌面框架**: Electron 28.3.3
*   **后端**: Node.js (Electron 主进程)
*   **状态管理**: Zustand 5.0.7
*   **构建工具**: Vite 5.4.8 + TypeScript 5.0.0
*   **代理协议**: Clash、Xray、Sing-box、OpenVPN、WireGuard
*   **部署环境**: Windows、macOS、Linux

---

## 2. 核心架构决策 (Key Architectural Decisions)

*   **[2025-08-15]**: 选择 Electron + React + TypeScript 技术栈。**原因**: 成熟稳定，生态丰富，跨平台支持好，开发效率高。
*   **[2025-08-15]**: 采用 Ant Design 作为 UI 组件库。**原因**: 现代化设计，组件丰富，主题支持好，企业级应用标准。
*   **[2025-08-15]**: 使用 Zustand 进行状态管理。**原因**: 轻量级，TypeScript 支持好，API 简洁。
*   **[2025-08-15]**: 集成多种代理协议引擎。**原因**: 利用现有成熟实现，降低开发复杂度，提供更广泛的协议支持。
*   **[2025-08-18]**: 禁用硬件加速和 WebRTC 功能。**原因**: 规避 GPU 进程崩溃导致的白屏问题，防止 IP 泄露。
*   **[2025-08-21]**: 实现 DNS 管理功能主进程迁移。**原因**: 提高 DNS 解析性能和安全性。
*   **[2025-09-06]**: 集成 CF-Edge 中间加密代理。**原因**: 提供更高级的隐私保护和流量混淆功能。

---

## 3. 模块职责表 (Codebase Map)

### 主进程 (src/main/)
*   `index.ts`: 应用入口，窗口管理，IPC 通信
*   `proxyManager.ts`: 代理引擎管理和控制
*   `systemProxyManager.ts`: 系统代理设置管理
*   `proxyModeManager.ts`: 代理模式切换管理
*   `settingsManager.ts`: 应用设置持久化管理
*   `coreDownloader.ts`: 代理核心文件下载管理
*   `crashMonitor.ts`: 崩溃监控和恢复
*   `systemMonitor.ts`: 系统资源监控
*   `services/`: 各种服务模块（DNS、泄露防护、CF-Edge 等）

### 渲染进程 (src/renderer/)
*   `pages/`: 主要页面组件（Dashboard、Settings、ProxyManagement 等）
*   `components/`: 可复用 UI 组件
*   `utils/`: 工具函数和业务逻辑
*   `contexts/`: React Context 状态管理
*   `types/`: TypeScript 类型定义

### 共享代码 (src/shared/)
*   `types/`: 跨进程共享的类型定义
*   `constants/`: 应用常量
*   `utils/`: 共享工具函数

---

## 4. 标准工作流与命令 (Standard Workflows & Commands)

*   **启动开发环境**: `npm run dev` (同时启动主进程和渲染进程)
*   **构建应用**: `npm run build` (构建主进程和渲染进程)
*   **打包分发**: `npm run dist` (使用 electron-builder 打包)
*   **运行测试**: `npm test` (Jest 单元测试)
*   **代码检查**: `npm run lint` (ESLint 检查)
*   **类型检查**: `npm run type-check` (TypeScript 类型检查)
*   **代码格式化**: `npm run format` (Prettier 格式化)

---

## 5. 用户特定偏好与规范 (User-Specific Conventions)

*   **代码风格**: 使用 ESLint + Prettier 进行代码格式化，遵循 TypeScript 严格模式
*   **组件设计**: 优先使用函数式组件和 React Hooks
*   **状态管理**: 使用 Zustand 进行全局状态管理，React Context 用于局部状态
*   **错误处理**: 使用 ErrorBoundary 和统一的错误处理机制
*   **日志记录**: 使用统一的 logger 工具，避免直接使用 console.log
*   **安全考虑**: 禁用硬件加速和 WebRTC，实现多种泄露防护机制

---

## 6. 重要提醒 (Critical Reminders)

*   **硬件加速**: 已禁用硬件加速以防止 GPU 进程崩溃，如需启用需谨慎测试
*   **WebRTC 防护**: 已禁用 WebRTC 相关功能以防止 IP 泄露，这是安全策略的一部分
*   **系统权限**: 代理功能需要系统级权限，在 macOS 和 Linux 上可能需要管理员权限
*   **协议兼容性**: 集成多种代理协议时需要注意配置格式的兼容性
*   **跨平台测试**: 所有功能都需要在 Windows、macOS、Linux 三个平台上进行测试
*   **性能监控**: 应用需要监控内存占用和 CPU 使用率，确保资源消耗合理
*   **数据持久化**: 使用 electron-store 进行配置持久化，注意数据迁移和版本兼容性

---

## 7. 当前开发状态 (Current Development Status)

### 已完成功能
*   ✅ 基础框架搭建 (Electron + React + TypeScript)
*   ✅ 现代化用户界面 (Ant Design + 主题切换)
*   ✅ 代理管理基础功能
*   ✅ 节点管理和订阅解析
*   ✅ 链式代理配置
*   ✅ DNS 管理功能
*   ✅ 泄露防护机制
*   ✅ CF-Edge 中间加密代理

### 进行中功能
*   🚧 代理模式完善与 VPN 模式实现
*   🚧 高级泄露防护功能增强
*   🚧 设置功能真实实现

### 计划中功能
*   📋 性能优化和资源管理
*   📋 插件系统
*   📋 云端同步
*   📋 高级规则配置

---

## 8. 关键文件路径 (Key File Paths)

*   **主进程入口**: `src/main/index.ts`
*   **渲染进程入口**: `src/renderer/main.tsx`
*   **应用配置**: `package.json`
*   **构建配置**: `vite.config.ts`, `tsconfig.json`
*   **打包配置**: `package.json` 中的 `build` 字段
*   **规划蓝图**: `plan report/` 目录
*   **进度报告**: `progress report/` 目录
*   **构建输出**: `dist/` 目录
*   **发布文件**: `release/` 目录

---

## 9. 开发注意事项 (Development Notes)

*   **IPC 通信**: 主进程和渲染进程通过 IPC 进行通信，注意消息格式的一致性
*   **资源管理**: 注意及时清理事件监听器和定时器，防止内存泄漏
*   **错误恢复**: 实现完善的错误恢复机制，确保应用稳定性
*   **用户体验**: 所有操作都应该有适当的加载状态和错误提示
*   **安全性**: 实现多层安全防护，包括 DNS 泄露、WebRTC 泄露、IPv6 泄露等
*   **性能优化**: 使用 LRU 缓存、懒加载等技术优化应用性能

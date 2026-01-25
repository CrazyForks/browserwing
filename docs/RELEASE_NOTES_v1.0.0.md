# BrowserWing 1.0.0 Release Notes 🎉

<p align="center">
  <img width="600" alt="BrowserWing" src="https://raw.githubusercontent.com/browserwing/browserwing/main/docs/assets/banner.svg">
</p>

**Release Date:** 2026-01-25  
**Version:** 1.0.0  
**License:** MIT

---

## 🌟 概述

BrowserWing 1.0.0 是首个正式版本，提供了完整的浏览器自动化平台，并深度集成 AI 能力。这是一个面向开发者、QA 工程师、数据分析师和 AI 应用开发者的强大工具，让浏览器自动化变得简单、智能、高效。

---

## ✨ 核心特性

### 1. 🤖 内置 AI Agent

**对话式浏览器控制**

- **多 LLM 支持**：兼容 OpenAI、Claude、DeepSeek、Gemini、通义千问、智谱 AI 等主流大模型
- **自然语言控制**：直接用中文或英文描述任务，AI 自动完成浏览器操作
- **智能任务规划**：自动评估任务复杂度，选择最优执行策略
- **实时流式响应**：所见即所得的执行过程展示
- **会话管理**：支持多会话并行，每个会话独立配置模型
- **性能优化**：
  - 启动时间减少 89%（4.5s → 0.5s）
  - 内存占用减少 97%（800MB → 24MB）
  - 简单问答响应速度提升 56%（4.5s → 2s）

**示例任务：**
```
"打开 GitHub，搜索 'browser automation'，提取前 10 个项目的名称和 Star 数"
"登录 Twitter，发布一条推文：'Hello from BrowserWing!'"
"监控京东商品价格变化，价格低于 500 元时通知我"
```

### 2. 🔌 通用 AI 工具集成

**三种集成方式，适配所有 AI 工具**

#### 方式一：MCP Server（推荐）

- **标准协议**：完整实现 Model Context Protocol (MCP)
- **零配置**：一行 JSON 配置即可接入任何支持 MCP 的 AI 工具
- **丰富工具集**：26+ 浏览器控制工具，包括导航、交互、提取、截图等

```json
{
  "mcpServers": {
    "browserwing": {
      "url": "http://localhost:8080/api/v1/mcp/message"
    }
  }
}
```

#### 方式二：Skills 文件

- **即插即用**：下载 SKILL.md，导入到 Cursor、Windsurf 等支持 Skills 的 AI 工具
- **自动发现**：AI 工具自动识别可用的浏览器控制能力
- **自定义导出**：将录制的脚本导出为自定义 Skills 文件

#### 方式三：HTTP API

- **26+ RESTful 端点**：完整的编程式浏览器控制
- **OpenAPI 文档**：标准化 API 规范，易于集成
- **批量操作**：支持多步骤原子执行

### 3. 🎬 可视化脚本录制与回放

**所见即所得的自动化工作流**

#### 录制功能
- **一键录制**：点击、输入、选择、导航等所有操作自动捕获
- **语义化记录**：基于 ARIA 角色和可访问性树的稳定元素定位
- **智能等待**：自动识别页面加载、元素出现等待条件
- **跨标签页支持**：支持多标签页操作录制

#### 编辑功能
- **可视化编辑器**：拖拽排序、删除、修改录制的步骤
- **参数调整**：修改 URL、选择器、输入文本等参数
- **添加逻辑**：插入等待、条件判断、循环等控制结构
- **变量系统**：支持脚本变量和数据提取变量

#### 回放功能
- **精确重现**：高保真回放录制的操作序列
- **步进调试**：逐步执行，观察每个操作的效果
- **错误恢复**：失败时自动重试或跳过
- **批量执行**：支持多个脚本顺序或并行执行

#### 导出功能
- **导出为 MCP 命令**：转换为 MCP 工具调用序列，供 AI 工具使用
- **导出为 Skills**：生成自定义 SKILL.md 文件
- **导出为代码**：生成 Python、JavaScript 等语言代码（计划中）

### 4. 🎯 智能数据提取

**LLM 驱动的语义提取**

- **自然语言描述**：用自然语言描述想提取的数据，无需写选择器
- **结构化输出**：自动将非结构化页面转换为 JSON 数据
- **多种提取方式**：
  - CSS/XPath 选择器提取
  - LLM 语义理解提取
  - 批量多字段提取
  - 分页自动翻页提取
- **截图标注**：提取时可配合截图，直观查看提取结果

**示例：**
```bash
# 传统方式：需要精确的 CSS 选择器
curl -X POST 'http://localhost:8080/api/v1/executor/extract' \
  -d '{"selector": "div.product > h2.title", "multiple": true}'

# LLM 方式：自然语言描述
curl -X POST 'http://localhost:8080/api/v1/executor/extract-semantic' \
  -d '{"instructions": "提取所有商品的名称、价格和评分"}'
```

### 5. 🔐 会话管理与认证

**稳定可靠的浏览器会话**

- **多浏览器实例**：支持同时管理多个独立的浏览器实例
- **用户数据持久化**：Cookie、LocalStorage、SessionStorage 自动保存
- **登录状态保持**：关闭后重新打开，登录状态自动恢复
- **代理支持**：每个实例可配置独立代理
- **自定义配置**：User-Agent、窗口大小、语言等灵活设置
- **无头模式**：支持有头/无头模式切换，适配不同场景

### 6. 📸 截图与调试

**强大的调试与监控能力**

- **全页截图**：捕获完整页面，包括滚动区域
- **元素截图**：精确截取指定元素
- **多格式支持**：PNG、JPEG 等格式
- **自动保存**：截图自动保存到指定目录，返回文件路径
- **可访问性快照**：获取页面的可访问性树，快速定位元素
- **RefID 系统**：为每个交互元素分配稳定的引用 ID（@e1, @e2...）

### 7. 🚀 高性能架构

**为生产环境优化**

- **Go 语言后端**：高性能、低延迟、并发友好
- **React + TypeScript 前端**：现代化、响应式 UI
- **延迟加载**：按需创建 Agent 实例，节省资源
- **连接池管理**：高效的浏览器连接复用
- **错误恢复**：自动处理 Chrome 崩溃、连接断开等异常
- **优雅关闭**：Ctrl+C 时自动清理资源，关闭浏览器

---

## 📋 完整功能列表

### 浏览器控制

- ✅ 导航：前进、后退、刷新、跳转 URL
- ✅ 标签页管理：新建、关闭、切换、列出
- ✅ 窗口管理：最大化、最小化、调整大小
- ✅ 元素交互：点击、输入、选择、悬停、拖拽
- ✅ 键盘操作：按键、快捷键、组合键
- ✅ 文件操作：上传文件、下载监控
- ✅ 滚动控制：滚动到元素、滚动页面
- ✅ JavaScript 执行：运行自定义 JS 代码
- ✅ Cookie 管理：获取、设置、删除 Cookie
- ✅ Storage 管理：LocalStorage、SessionStorage 操作

### 数据提取

- ✅ 文本提取：innerText、textContent
- ✅ HTML 提取：innerHTML、outerHTML
- ✅ 属性提取：href、src、data-* 等
- ✅ 多元素提取：批量提取列表数据
- ✅ LLM 语义提取：自然语言描述提取需求
- ✅ 表格提取：自动识别表格结构
- ✅ 分页提取：自动翻页并聚合数据

### AI 能力

- ✅ 多 LLM 支持：OpenAI、Claude、DeepSeek 等
- ✅ 流式响应：实时查看 AI 执行过程
- ✅ 任务评估：智能判断是否需要工具调用
- ✅ 直接响应：简单问题快速响应（性能提升 56%）
- ✅ 工具调用：自动选择合适的浏览器工具
- ✅ 错误处理：失败自动重试或报告
- ✅ 会话管理：多会话并行，历史记录保存

### 脚本与自动化

- ✅ 一键录制：自动捕获所有操作
- ✅ 可视化编辑：拖拽调整步骤顺序
- ✅ 变量支持：脚本变量和提取变量
- ✅ 条件执行：基于提取数据的条件判断
- ✅ 批量回放：多个脚本顺序执行
- ✅ 导出为 Skills：生成 SKILL.md 文件
- ✅ 导出为 MCP：生成 MCP 工具调用序列

### 集成与扩展

- ✅ MCP Server：标准 MCP 协议实现
- ✅ Skills 文件：Cursor、Windsurf 等工具兼容
- ✅ HTTP API：26+ RESTful 端点
- ✅ OpenAPI 规范：标准化 API 文档
- ✅ Webhook：事件通知（计划中）
- ✅ 插件系统：扩展自定义功能（计划中）

---

## 🎯 使用场景

### 1. RPA（机器人流程自动化）

- **数据录入**：自动填写表单、提交订单
- **报表生成**：定期抓取数据，生成 Excel 报告
- **邮件处理**：自动登录邮箱，分类处理邮件
- **发票处理**：批量下载发票，提取信息

### 2. 数据采集与监控

- **价格监控**：监控电商价格变化，价格提醒
- **竞品分析**：采集竞品信息，对比分析
- **舆情监控**：监控社交媒体，分析用户反馈
- **房源监控**：实时监控房源信息，第一时间通知

### 3. 自动化测试

- **E2E 测试**：端到端功能测试
- **回归测试**：批量回放测试用例
- **UI 测试**：截图对比，视觉回归测试
- **性能测试**：页面加载时间监控

### 4. AI Agent 开发

- **智能助手**：为 AI 助手提供浏览器操作能力
- **信息检索**：AI 自动搜索和提取网页信息
- **任务执行**：AI 驱动的复杂任务自动化
- **知识库构建**：自动采集和整理知识内容

### 5. 内容创作与管理

- **自动发布**：批量发布博客、社交媒体内容
- **内容采集**：采集优质内容，辅助创作
- **SEO 优化**：自动检查 SEO 问题，生成报告
- **评论管理**：自动回复评论，互动管理

---

## 🚀 快速开始

### 安装

**方式一：npm（推荐）**
```bash
npm install -g browserwing
browserwing --port 8080
```

**方式二：一键安装脚本**
```bash
# Linux / macOS
curl -fsSL https://raw.githubusercontent.com/browserwing/browserwing/main/install.sh | bash

# Windows (PowerShell)
iwr -useb https://raw.githubusercontent.com/browserwing/browserwing/main/install.ps1 | iex
```

**方式三：手动下载**

从 [Releases](https://github.com/browserwing/browserwing/releases) 下载对应平台的二进制文件。

### 启动服务

```bash
browserwing --port 8080

# 或使用配置文件
browserwing --config config.toml

# 指定数据目录
browserwing --data-dir ./my-data
```

启动后访问：`http://localhost:8080`

### 快速集成到 AI 工具

#### 集成到支持 MCP 的工具

在 AI 工具的 MCP 配置中添加：

```json
{
  "mcpServers": {
    "browserwing": {
      "url": "http://localhost:8080/api/v1/mcp/message"
    }
  }
}
```

#### 集成到支持 Skills 的工具（如 Cursor）

1. 下载 [SKILL.md](https://raw.githubusercontent.com/browserwing/browserwing/main/SKILL.md)
2. 在 Cursor 中导入 Skills 文件
3. 开始使用自然语言控制浏览器

### 第一个自动化任务

**使用内置 AI Agent：**

1. 打开 `http://localhost:8080`
2. 进入"AI Agent"页面
3. 配置 LLM（输入 API Key 和模型）
4. 输入任务：

```
打开 GitHub，搜索 'browser automation'，提取前 5 个项目的名称和描述
```

**使用 HTTP API：**

```bash
# 1. 导航到页面
curl -X POST 'http://localhost:8080/api/v1/executor/navigate' \
  -H 'Content-Type: application/json' \
  -d '{"url": "https://github.com/search?q=browser+automation"}'

# 2. 等待加载
sleep 2

# 3. 获取可访问性快照
curl -X GET 'http://localhost:8080/api/v1/executor/snapshot'

# 4. 提取数据
curl -X POST 'http://localhost:8080/api/v1/executor/extract' \
  -H 'Content-Type: application/json' \
  -d '{
    "selector": ".repo-list-item",
    "fields": ["text"],
    "multiple": true
  }'
```

---

## 📊 性能指标

| 指标 | 数值 | 说明 |
|------|------|------|
| 启动时间 | < 1秒 | 100 个会话时仅需 0.5 秒 |
| 内存占用 | 24MB | 100 个会话时（延迟加载） |
| 简单问答响应 | 2秒 | 直接响应优化后 |
| API 延迟 | < 50ms | 本地请求平均延迟 |
| 并发支持 | 100+ | 同时管理 100+ 浏览器实例 |
| Token 效率 | -40% | 优化后减少 40% Token 消耗 |

---

## 🔧 配置说明

### 配置文件示例 (config.toml)

```toml
# HTTP 服务器配置
[server]
port = 8080
host = "0.0.0.0"

# 数据存储配置
[storage]
data_dir = "./data"
db_file = "browserwing.db"

# 浏览器配置
[browser]
executable_path = ""  # 留空自动检测
user_data_dir = "./chrome_user_data"
headless = false
window_width = 1920
window_height = 1080

# MCP 服务配置
[mcp]
enabled = true
endpoint = "/api/v1/mcp/message"

# 日志配置
[logging]
level = "info"  # debug, info, warn, error
file = "logs/browserwing.log"
```

### 环境变量支持

```bash
# 端口配置
export BROWSERWING_PORT=8080

# 数据目录
export BROWSERWING_DATA_DIR=./data

# Chrome 路径
export CHROME_PATH=/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome

# 日志级别
export LOG_LEVEL=info
```

---

## 📚 文档资源

### 核心文档

- **[README.md](./README.md)** - 项目概览和快速开始
- **[SKILL.md](./SKILL.md)** - Skills 文件，可直接导入 AI 工具
- **[EXECUTOR_HTTP_API.md](./docs/EXECUTOR_HTTP_API.md)** - 完整的 HTTP API 参考
- **[MCP_INTEGRATION.md](./docs/MCP_INTEGRATION.md)** - MCP 集成指南

### 功能文档

- **[SCRIPT_VARIABLES_FEATURE.md](./docs/SCRIPT_VARIABLES_FEATURE.md)** - 脚本变量系统
- **[CONDITIONAL_EXECUTION_FEATURE.md](./docs/CONDITIONAL_EXECUTION_FEATURE.md)** - 条件执行功能
- **[REFID_IMPLEMENTATION.md](./docs/REFID_IMPLEMENTATION.md)** - RefID 系统设计
- **[SEMANTIC_RECORDING_ENHANCEMENT.md](./docs/SEMANTIC_RECORDING_ENHANCEMENT.md)** - 语义化录制

### 最佳实践

- **[ELEMENT_SELECTION_GUIDE.md](./docs/ELEMENT_SELECTION_GUIDE.md)** - 元素选择最佳实践
- **[BROWSER_EVALUATE_GUIDE.md](./docs/BROWSER_EVALUATE_GUIDE.md)** - JavaScript 执行指南
- **[LOGIN_TROUBLESHOOTING.md](./docs/LOGIN_TROUBLESHOOTING.md)** - 登录问题排查

---

## 🐛 已知问题与解决方案

### macOS 代码签名问题

**问题：** macOS 用户运行时可能遇到 "killed" 错误。

**解决方案：**
```bash
xattr -d com.apple.quarantine $(which browserwing)
```

详见：[MACOS_INSTALLATION_FIX.md](./docs/MACOS_INSTALLATION_FIX.md)

### Chrome SingletonLock 错误

**问题：** 重启后可能出现 SingletonLock 文件锁定。

**解决方案：** 已在 1.0.0 中自动修复，会自动清理锁文件。

详见：[SINGLETON_LOCK_COMPLETE_FIX.md](./docs/SINGLETON_LOCK_COMPLETE_FIX.md)

### 元素定位失败

**问题：** 页面结构变化导致元素定位失败。

**解决方案：** 使用 RefID 系统（@e1, @e2）而非 CSS 选择器，更稳定。

详见：[REFID_IMPLEMENTATION.md](./docs/REFID_IMPLEMENTATION.md)

---

## 🎉 1.0.0 版本亮点

### 性能提升

- ✅ **启动速度提升 89%**：100 个会话时从 4.5s 降至 0.5s
- ✅ **内存占用减少 97%**：100 个会话时从 800MB 降至 24MB
- ✅ **响应速度提升 56%**：简单问答从 4.5s 降至 2s
- ✅ **API 成本降低 30%**：优化 Token 使用效率

### 功能增强

- ✅ **RefID 系统**：稳定的元素引用，解决动态页面定位问题
- ✅ **直接响应优化**：简单问题跳过工具评估，直接返回
- ✅ **延迟加载**：按需创建 Agent 实例，节省资源
- ✅ **模型绑定**：会话与 LLM 模型强绑定，重启后不丢失
- ✅ **默认模型显示**：历史会话清晰显示使用的模型
- ✅ **数据持久化修复**：工具调用后 LLMConfigID 不再丢失

### 稳定性改进

- ✅ **错误恢复**：自动处理 Chrome 崩溃、连接断开
- ✅ **锁文件清理**：自动清理 SingletonLock 文件
- ✅ **连接检查**：主动检测浏览器连接状态
- ✅ **优雅关闭**：Ctrl+C 时自动清理资源
- ✅ **Debug 日志禁用**：生产环境清爽的日志输出

### 用户体验优化

- ✅ **信息透明**：清晰显示使用的 LLM 模型
- ✅ **自然流畅**：移除不自然的 Greeting 消息
- ✅ **会话管理**：支持多会话，历史记录完整
- ✅ **实时反馈**：流式响应，实时查看执行过程
- ✅ **错误提示**：友好的错误信息和解决建议

---

## 🗺️ 路线图

### 1.1.0（计划中）

- [ ] 插件系统：支持自定义扩展
- [ ] Webhook 通知：事件触发通知
- [ ] 代码生成：录制脚本导出为 Python、JS 代码
- [ ] 调度系统：定时执行脚本
- [ ] 分布式支持：多机器协同执行

### 1.2.0（计划中）

- [ ] 云端执行：浏览器运行在云端
- [ ] 团队协作：多人共享脚本和配置
- [ ] 市场：脚本模板和工具分享
- [ ] 移动端支持：移动浏览器自动化
- [ ] 视频录制：录制操作过程为视频

---

## 💬 社区与支持

### 获取帮助

- **文档**：[https://browserwing.com/docs](https://browserwing.com)
- **GitHub Issues**：[https://github.com/browserwing/browserwing/issues](https://github.com/browserwing/browserwing/issues)
- **Discord 社区**：[https://discord.gg/BkqcApRj](https://discord.gg/BkqcApRj)
- **Twitter**：[@chg80333](https://x.com/chg80333)

### 贡献指南

欢迎贡献代码、文档、测试用例或功能建议！

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

详见：[CONTRIBUTING.md](./CONTRIBUTING.md)

---

## 📝 更新日志

### 1.0.0 (2026-01-25)

#### 新增功能
- 🎉 首个正式版本发布
- 🤖 内置 AI Agent，支持多 LLM
- 🔌 MCP Server 实现
- 📝 Skills 文件支持
- 🎬 可视化脚本录制与回放
- 🎯 LLM 驱动的语义数据提取
- 🔐 完整的会话管理
- 📸 截图和可访问性快照
- 🚀 26+ HTTP API 端点

#### 性能优化
- ⚡ 启动速度提升 89%
- 💾 内存占用减少 97%
- 🏃 简单问答响应提升 56%
- 💰 API Token 消耗降低 40%

#### 稳定性改进
- 🔧 自动清理 SingletonLock 文件
- 🛡️ Chrome 崩溃自动恢复
- 🔄 连接断开自动重连
- 🧹 优雅关闭和资源清理

#### 用户体验
- ✨ RefID 系统，稳定的元素定位
- 📊 清晰的模型信息显示
- 🎨 流畅的实时响应
- 📖 完整的文档体系

---

## 🙏 致谢

感谢所有贡献者、测试者和早期用户的支持！

特别感谢：
- Go-rod 项目提供的强大浏览器控制能力
- Anthropic 的 MCP 协议标准
- 所有反馈和建议的用户

---

## 📄 许可证

MIT License - 详见 [LICENSE](./LICENSE)

---

## ⚠️ 免责声明

- 请勿用于非法目的或违反网站服务条款
- 仅用于个人学习和合法的自动化用途
- 使用本工具时请遵守目标网站的 robots.txt 和使用条款
- 作者不对使用本工具造成的任何损失负责

---

<p align="center">
  <strong>BrowserWing - 让浏览器自动化更简单、更智能 🚀</strong>
</p>

<p align="center">
  <a href="https://github.com/browserwing/browserwing">GitHub</a> •
  <a href="https://browserwing.com">官网</a> •
  <a href="https://discord.gg/BkqcApRj">Discord</a> •
  <a href="https://x.com/chg80333">Twitter</a>
</p>

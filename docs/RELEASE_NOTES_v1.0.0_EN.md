# BrowserWing 1.0.0 Release Notes 🎉

<p align="center">
  <img width="600" alt="BrowserWing" src="https://raw.githubusercontent.com/browserwing/browserwing/main/docs/assets/banner.svg">
</p>

**Release Date:** 2026-01-25  
**Version:** 1.0.0  
**License:** MIT

---

## 🌟 Overview

BrowserWing 1.0.0 is the first official release, delivering a complete browser automation platform with deep AI integration. A powerful tool for developers, QA engineers, data analysts, and AI application developers, making browser automation simple, intelligent, and efficient.

---

## ✨ Core Features

### 1. 🤖 Built-in AI Agent

**Conversational Browser Control**

- **Multi-LLM Support**: Compatible with OpenAI, Claude, DeepSeek, Gemini, and more
- **Natural Language Control**: Describe tasks in plain language, AI automates browser operations
- **Intelligent Task Planning**: Automatically evaluates task complexity and selects optimal execution strategy
- **Real-time Streaming**: See execution progress as it happens
- **Session Management**: Support multiple parallel sessions, each with independent model configuration
- **Performance Optimized**:
  - Startup time reduced by 89% (4.5s → 0.5s)
  - Memory usage reduced by 97% (800MB → 24MB)
  - Simple query response time improved by 56% (4.5s → 2s)

**Example Tasks:**
```
"Open GitHub, search for 'browser automation', extract names and star counts of top 10 projects"
"Log in to Twitter, post a tweet: 'Hello from BrowserWing!'"
"Monitor product price on Amazon, notify me when price drops below $50"
```

### 2. 🔌 Universal AI Tool Integration

**Three Integration Methods for All AI Tools**

#### Method 1: MCP Server (Recommended)

- **Standard Protocol**: Full Model Context Protocol (MCP) implementation
- **Zero Configuration**: One-line JSON config to integrate with any MCP-compatible AI tool
- **Rich Tool Set**: 26+ browser control tools including navigation, interaction, extraction, screenshots

```json
{
  "mcpServers": {
    "browserwing": {
      "url": "http://localhost:8080/api/v1/mcp/message"
    }
  }
}
```

#### Method 2: Skills File

- **Plug and Play**: Download SKILL.md, import into Cursor, Windsurf, and other Skills-compatible tools
- **Auto Discovery**: AI tools automatically recognize available browser control capabilities
- **Custom Export**: Export recorded scripts as custom Skills files

#### Method 3: HTTP API

- **26+ RESTful Endpoints**: Complete programmatic browser control
- **OpenAPI Documentation**: Standardized API specs for easy integration
- **Batch Operations**: Multi-step atomic execution support

### 3. 🎬 Visual Script Recording & Playback

**WYSIWYG Automation Workflows**

#### Recording Features
- **One-Click Recording**: Automatically captures clicks, inputs, selections, navigation
- **Semantic Recording**: Stable element location based on ARIA roles and accessibility tree
- **Smart Waits**: Auto-detects page loading, element appearance wait conditions
- **Cross-Tab Support**: Records operations across multiple tabs

#### Editing Features
- **Visual Editor**: Drag to reorder, delete, modify recorded steps
- **Parameter Adjustment**: Modify URLs, selectors, input text
- **Logic Addition**: Insert waits, conditionals, loops
- **Variable System**: Support script variables and extraction variables

#### Playback Features
- **Precise Reproduction**: High-fidelity replay of recorded sequences
- **Step Debugging**: Execute step-by-step, observe each operation's effect
- **Error Recovery**: Auto-retry or skip on failures
- **Batch Execution**: Sequential or parallel execution of multiple scripts

#### Export Features
- **Export as MCP Commands**: Convert to MCP tool call sequences for AI tools
- **Export as Skills**: Generate custom SKILL.md files
- **Export as Code**: Generate Python, JavaScript code (planned)

### 4. 🎯 Intelligent Data Extraction

**LLM-Driven Semantic Extraction**

- **Natural Language Description**: Describe data to extract in plain language, no selectors needed
- **Structured Output**: Auto-convert unstructured pages to JSON data
- **Multiple Extraction Methods**:
  - CSS/XPath selector extraction
  - LLM semantic understanding extraction
  - Batch multi-field extraction
  - Auto-pagination extraction
- **Screenshot Annotation**: Pair extraction with screenshots for visual reference

**Example:**
```bash
# Traditional: Precise CSS selectors required
curl -X POST 'http://localhost:8080/api/v1/executor/extract' \
  -d '{"selector": "div.product > h2.title", "multiple": true}'

# LLM: Natural language description
curl -X POST 'http://localhost:8080/api/v1/executor/extract-semantic' \
  -d '{"instructions": "Extract all product names, prices, and ratings"}'
```

### 5. 🔐 Session Management & Authentication

**Stable and Reliable Browser Sessions**

- **Multiple Browser Instances**: Manage multiple independent browser instances simultaneously
- **User Data Persistence**: Cookies, LocalStorage, SessionStorage auto-saved
- **Login State Retention**: Login state automatically restored after reopening
- **Proxy Support**: Each instance can configure independent proxy
- **Custom Configuration**: User-Agent, window size, language, etc.
- **Headless Mode**: Support headless/headed mode switching for different scenarios

### 6. 📸 Screenshots & Debugging

**Powerful Debugging and Monitoring**

- **Full Page Screenshots**: Capture complete page including scroll areas
- **Element Screenshots**: Precisely capture specific elements
- **Multiple Formats**: PNG, JPEG, etc.
- **Auto Save**: Screenshots auto-saved to specified directory, returns file path
- **Accessibility Snapshot**: Get page accessibility tree, quickly locate elements
- **RefID System**: Assigns stable reference IDs to each interactive element (@e1, @e2...)

### 7. 🚀 High-Performance Architecture

**Optimized for Production**

- **Go Backend**: High performance, low latency, concurrency-friendly
- **React + TypeScript Frontend**: Modern, responsive UI
- **Lazy Loading**: Create Agent instances on-demand, save resources
- **Connection Pooling**: Efficient browser connection reuse
- **Error Recovery**: Auto-handle Chrome crashes, connection drops
- **Graceful Shutdown**: Auto-cleanup resources on Ctrl+C, close browsers

---

## 📋 Complete Feature List

### Browser Control

- ✅ Navigation: Forward, back, refresh, jump to URL
- ✅ Tab Management: New, close, switch, list
- ✅ Window Management: Maximize, minimize, resize
- ✅ Element Interaction: Click, type, select, hover, drag
- ✅ Keyboard Operations: Keys, shortcuts, combinations
- ✅ File Operations: Upload files, monitor downloads
- ✅ Scroll Control: Scroll to element, scroll page
- ✅ JavaScript Execution: Run custom JS code
- ✅ Cookie Management: Get, set, delete cookies
- ✅ Storage Management: LocalStorage, SessionStorage operations

### Data Extraction

- ✅ Text Extraction: innerText, textContent
- ✅ HTML Extraction: innerHTML, outerHTML
- ✅ Attribute Extraction: href, src, data-*, etc.
- ✅ Multi-Element Extraction: Batch extract list data
- ✅ LLM Semantic Extraction: Natural language extraction requirements
- ✅ Table Extraction: Auto-recognize table structure
- ✅ Pagination Extraction: Auto-paginate and aggregate data

### AI Capabilities

- ✅ Multi-LLM Support: OpenAI, Claude, DeepSeek, etc.
- ✅ Streaming Response: Real-time view of AI execution
- ✅ Task Evaluation: Intelligently determine if tool calls needed
- ✅ Direct Response: Fast response for simple questions (56% faster)
- ✅ Tool Calling: Auto-select appropriate browser tools
- ✅ Error Handling: Auto-retry or report failures
- ✅ Session Management: Parallel sessions, saved history

### Scripts & Automation

- ✅ One-Click Recording: Auto-capture all operations
- ✅ Visual Editing: Drag to adjust step order
- ✅ Variable Support: Script variables and extraction variables
- ✅ Conditional Execution: Conditions based on extracted data
- ✅ Batch Playback: Sequential execution of multiple scripts
- ✅ Export as Skills: Generate SKILL.md files
- ✅ Export as MCP: Generate MCP tool call sequences

### Integration & Extension

- ✅ MCP Server: Standard MCP protocol implementation
- ✅ Skills File: Cursor, Windsurf compatible
- ✅ HTTP API: 26+ RESTful endpoints
- ✅ OpenAPI Spec: Standardized API documentation
- ✅ Webhooks: Event notifications (planned)
- ✅ Plugin System: Extend with custom features (planned)

---

## 🎯 Use Cases

### 1. RPA (Robotic Process Automation)

- **Data Entry**: Auto-fill forms, submit orders
- **Report Generation**: Periodically scrape data, generate Excel reports
- **Email Processing**: Auto-login to email, categorize and process
- **Invoice Processing**: Batch download invoices, extract information

### 2. Data Collection & Monitoring

- **Price Monitoring**: Monitor e-commerce price changes, price alerts
- **Competitor Analysis**: Collect competitor information, comparative analysis
- **Sentiment Monitoring**: Monitor social media, analyze user feedback
- **Property Monitoring**: Real-time property listings, immediate notifications

### 3. Automated Testing

- **E2E Testing**: End-to-end functional testing
- **Regression Testing**: Batch replay test cases
- **UI Testing**: Screenshot comparison, visual regression testing
- **Performance Testing**: Page load time monitoring

### 4. AI Agent Development

- **Intelligent Assistant**: Provide browser operation capabilities for AI assistants
- **Information Retrieval**: AI auto-search and extract web information
- **Task Execution**: AI-driven complex task automation
- **Knowledge Base Building**: Auto-collect and organize knowledge content

### 5. Content Creation & Management

- **Auto Publishing**: Batch publish blog, social media content
- **Content Collection**: Collect quality content, assist creation
- **SEO Optimization**: Auto-check SEO issues, generate reports
- **Comment Management**: Auto-reply comments, interaction management

---

## 🚀 Quick Start

### Installation

**Method 1: npm (Recommended)**
```bash
npm install -g browserwing
browserwing --port 8080
```

**Method 2: One-Line Install Script**
```bash
# Linux / macOS
curl -fsSL https://raw.githubusercontent.com/browserwing/browserwing/main/install.sh | bash

# Windows (PowerShell)
iwr -useb https://raw.githubusercontent.com/browserwing/browserwing/main/install.ps1 | iex
```

**Method 3: Manual Download**

Download the binary for your platform from [Releases](https://github.com/browserwing/browserwing/releases).

### Start Service

```bash
browserwing --port 8080

# Or use config file
browserwing --config config.toml

# Specify data directory
browserwing --data-dir ./my-data
```

After starting, visit: `http://localhost:8080`

### Quick Integration with AI Tools

#### Integrate with MCP-Compatible Tools

Add to your AI tool's MCP configuration:

```json
{
  "mcpServers": {
    "browserwing": {
      "url": "http://localhost:8080/api/v1/mcp/message"
    }
  }
}
```

#### Integrate with Skills-Compatible Tools (e.g. Cursor)

1. Download [SKILL.md](https://raw.githubusercontent.com/browserwing/browserwing/main/SKILL.md)
2. Import Skills file in Cursor
3. Start controlling browser with natural language

### First Automation Task

**Using Built-in AI Agent:**

1. Open `http://localhost:8080`
2. Go to "AI Agent" page
3. Configure LLM (enter API Key and model)
4. Enter task:

```
Open GitHub, search for 'browser automation', extract names and descriptions of top 5 projects
```

**Using HTTP API:**

```bash
# 1. Navigate to page
curl -X POST 'http://localhost:8080/api/v1/executor/navigate' \
  -H 'Content-Type: application/json' \
  -d '{"url": "https://github.com/search?q=browser+automation"}'

# 2. Wait for loading
sleep 2

# 3. Get accessibility snapshot
curl -X GET 'http://localhost:8080/api/v1/executor/snapshot'

# 4. Extract data
curl -X POST 'http://localhost:8080/api/v1/executor/extract' \
  -H 'Content-Type: application/json' \
  -d '{
    "selector": ".repo-list-item",
    "fields": ["text"],
    "multiple": true
  }'
```

---

## 📊 Performance Metrics

| Metric | Value | Notes |
|--------|-------|-------|
| Startup Time | < 1s | Only 0.5s with 100 sessions |
| Memory Usage | 24MB | 100 sessions (lazy loading) |
| Simple Query Response | 2s | After direct response optimization |
| API Latency | < 50ms | Average local request latency |
| Concurrency | 100+ | Manage 100+ browser instances simultaneously |
| Token Efficiency | -40% | 40% reduction after optimization |

---

## 🎉 1.0.0 Highlights

### Performance Improvements

- ✅ **Startup Speed 89% Faster**: 100 sessions from 4.5s to 0.5s
- ✅ **Memory Usage 97% Lower**: 100 sessions from 800MB to 24MB
- ✅ **Response Speed 56% Faster**: Simple queries from 4.5s to 2s
- ✅ **API Cost 30% Lower**: Optimized Token usage efficiency

### Feature Enhancements

- ✅ **RefID System**: Stable element references, solves dynamic page location issues
- ✅ **Direct Response Optimization**: Simple questions skip tool evaluation, direct return
- ✅ **Lazy Loading**: Create Agent instances on-demand, save resources
- ✅ **Model Binding**: Sessions strongly bound to LLM models, not lost after restart
- ✅ **Default Model Display**: Historical sessions clearly show used model
- ✅ **Data Persistence Fix**: LLMConfigID no longer lost after tool calls

### Stability Improvements

- ✅ **Error Recovery**: Auto-handle Chrome crashes, connection drops
- ✅ **Lock File Cleanup**: Auto-cleanup SingletonLock files
- ✅ **Connection Check**: Proactively detect browser connection status
- ✅ **Graceful Shutdown**: Auto-cleanup resources on Ctrl+C
- ✅ **Debug Log Disable**: Clean log output in production

### User Experience Optimizations

- ✅ **Information Transparency**: Clearly display used LLM model
- ✅ **Natural Flow**: Removed unnatural Greeting messages
- ✅ **Session Management**: Support multiple sessions, complete history
- ✅ **Real-time Feedback**: Streaming response, real-time execution view
- ✅ **Error Messages**: Friendly error messages and solution suggestions

---

## 🗺️ Roadmap

### 1.1.0 (Planned)

- [ ] Plugin System: Support custom extensions
- [ ] Webhook Notifications: Event-triggered notifications
- [ ] Code Generation: Export recorded scripts as Python, JS code
- [ ] Scheduling System: Scheduled script execution
- [ ] Distributed Support: Multi-machine collaborative execution

### 1.2.0 (Planned)

- [ ] Cloud Execution: Browser runs in cloud
- [ ] Team Collaboration: Multi-user shared scripts and configs
- [ ] Marketplace: Script templates and tool sharing
- [ ] Mobile Support: Mobile browser automation
- [ ] Video Recording: Record operation process as video

---

## 💬 Community & Support

### Get Help

- **Documentation**: [https://browserwing.com/docs](https://browserwing.com)
- **GitHub Issues**: [https://github.com/browserwing/browserwing/issues](https://github.com/browserwing/browserwing/issues)
- **Discord Community**: [https://discord.gg/BkqcApRj](https://discord.gg/BkqcApRj)
- **Twitter**: [@chg80333](https://x.com/chg80333)

### Contributing

Contributions are welcome! Code, documentation, test cases, or feature suggestions.

1. Fork the project
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Create Pull Request

See: [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## 📝 Changelog

### 1.0.0 (2026-01-25)

#### New Features
- 🎉 First official release
- 🤖 Built-in AI Agent with multi-LLM support
- 🔌 MCP Server implementation
- 📝 Skills file support
- 🎬 Visual script recording & playback
- 🎯 LLM-driven semantic data extraction
- 🔐 Complete session management
- 📸 Screenshots and accessibility snapshots
- 🚀 26+ HTTP API endpoints

#### Performance Optimizations
- ⚡ Startup speed improved by 89%
- 💾 Memory usage reduced by 97%
- 🏃 Simple query response improved by 56%
- 💰 API Token consumption reduced by 40%

#### Stability Improvements
- 🔧 Auto-cleanup SingletonLock files
- 🛡️ Chrome crash auto-recovery
- 🔄 Connection drop auto-reconnect
- 🧹 Graceful shutdown and resource cleanup

#### User Experience
- ✨ RefID system for stable element location
- 📊 Clear model information display
- 🎨 Smooth real-time response
- 📖 Complete documentation system

---

## 🙏 Acknowledgements

Thanks to all contributors, testers, and early users!

Special thanks to:
- Go-rod project for powerful browser control
- Anthropic for MCP protocol standard
- All users providing feedback and suggestions

---

## 📄 License

MIT License - See [LICENSE](./LICENSE)

---

## ⚠️ Disclaimer

- Do not use for illegal purposes or violating website terms of service
- For personal learning and legitimate automation only
- Respect target website's robots.txt and terms of use
- Author not responsible for any losses caused by using this tool

---

<p align="center">
  <strong>BrowserWing - Make Browser Automation Simple and Intelligent 🚀</strong>
</p>

<p align="center">
  <a href="https://github.com/browserwing/browserwing">GitHub</a> •
  <a href="https://browserwing.com">Website</a> •
  <a href="https://discord.gg/BkqcApRj">Discord</a> •
  <a href="https://x.com/chg80333">Twitter</a>
</p>

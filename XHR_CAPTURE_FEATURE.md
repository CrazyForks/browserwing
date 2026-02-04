# XHR请求捕获功能

## 功能概述

该功能为Browserwing录制器添加了创新的XHR/Fetch请求监听和捕获能力，可以在录制浏览器操作时同时捕获网络请求数据，并在回放时自动获取相同的XHR响应。

## 功能特性

### 1. 自动监听网络请求
- **从页面加载开始监听**：在开始录制时自动注入XHR/Fetch拦截器
- **支持多种请求类型**：同时支持XMLHttpRequest和Fetch API
- **完整信息捕获**：记录请求方法、URL、状态码、响应时间、响应数据等

### 2. 可视化XHR请求列表
- **实时更新**：录制过程中实时显示捕获的请求数量（红色角标）
- **详细信息展示**：每个请求显示HTTP方法、URL、状态码、耗时、响应大小
- **美观的UI设计**：紫色渐变按钮，现代化的对话框设计

### 3. 选择性录制
- **按需选择**：用户可以从捕获列表中选择需要的XHR请求
- **自动生成变量**：为每个选中的请求自动生成变量名（如`xhr_data_0`）
- **记录为action**：选中的请求被记录为`capture_xhr`类型的操作步骤

### 4. 智能回放
- **自动拦截**：回放时自动注入XHR拦截器
- **精确匹配**：根据方法和URL精确匹配目标请求
- **超时保护**：30秒超时机制，防止无限等待
- **数据提取**：自动提取响应数据并保存到变量中

## 使用方法

### 录制阶段

1. **开始录制**
   - 点击"开始录制页面"按钮
   - XHR监听器会自动安装并开始监听

2. **触发网络请求**
   - 在页面上执行需要录制的操作
   - 这些操作触发的XHR/Fetch请求会被自动捕获
   - XHR监听按钮上的角标会显示捕获数量

3. **查看和选择XHR请求**
   - 点击"XHR监听"按钮（紫色渐变）
   - 在弹出的对话框中查看所有捕获的请求
   - 每个请求显示：
     - HTTP方法（彩色标签：GET绿色、POST蓝色、PUT橙色、DELETE红色）
     - 完整URL
     - 状态码和状态文本
     - 请求耗时（毫秒）
     - 响应大小（KB）

4. **录制XHR请求**
   - 点击想要录制的请求的"选择此请求"按钮
   - 该请求会作为一个操作步骤添加到录制列表
   - 自动分配变量名用于存储响应数据

### 回放阶段

1. **自动拦截**
   - 回放脚本时，系统会自动在页面注入XHR拦截器
   
2. **等待匹配**
   - 当执行到`capture_xhr`类型的步骤时
   - 系统会等待指定的XHR请求完成（根据方法和URL匹配）
   
3. **数据提取**
   - 请求完成后，自动提取响应数据
   - 数据保存到指定的变量中
   - 可在后续步骤中使用该变量

## 技术实现

### 前端（recorder.js）

1. **XHR拦截器**
   ```javascript
   // 拦截XMLHttpRequest.prototype.open和send
   // 拦截window.fetch
   // 记录请求信息到window.__capturedXHRs__
   ```

2. **UI组件**
   - XHR监听按钮（带角标）
   - XHR请求对话框
   - 请求列表项组件

3. **数据结构**
   ```javascript
   {
     id: 'xhr_xxx',
     type: 'xhr' | 'fetch',
     method: 'GET|POST|PUT|DELETE|PATCH',
     url: 'https://...',
     startTime: timestamp,
     endTime: timestamp,
     duration: milliseconds,
     status: 200,
     statusText: 'OK',
     requestHeaders: {},
     responseHeaders: {},
     requestBody: data,
     response: data,
     responseSize: bytes
   }
   ```

### 后端（Go）

1. **Models（script.go）**
   ```go
   type ScriptAction struct {
     // ... 现有字段
     Method string // HTTP方法
     Status int    // HTTP状态码
     XHRID  string // XHR请求ID
   }
   ```

2. **Player（player.go）**
   ```go
   func executeCaptureXHR() {
     // 注入XHR拦截脚本
     // 轮询等待目标请求完成
     // 提取响应数据并保存
   }
   ```

3. **I18n（i18n.go）**
   - 支持中文简体、繁体、英语、西班牙语、日语
   - 所有UI文本完全本地化

## 应用场景

1. **API测试**
   - 录制登录流程并捕获JWT token
   - 在后续步骤中使用token进行API调用

2. **数据验证**
   - 捕获搜索请求的响应数据
   - 验证返回的结果是否符合预期

3. **动态内容抓取**
   - 捕获AJAX加载的数据
   - 无需从DOM中提取，直接获取原始JSON数据

4. **接口监控**
   - 录制完整的用户操作流程
   - 监控关键API接口的响应时间和状态

## 文件修改清单

### 前端JavaScript
- ✅ `backend/services/browser/scripts/recorder.js` - 添加XHR拦截和UI
- ✅ `backend/services/browser/i18n.go` - 添加多语言翻译

### 后端Go
- ✅ `backend/models/script.go` - 添加XHR相关字段
- ✅ `backend/services/browser/player.go` - 添加XHR回放逻辑

## 注意事项

1. **跨域限制**
   - XHR拦截器在同源页面工作良好
   - 跨域请求可能受到CORS限制

2. **性能影响**
   - 拦截器对性能影响很小
   - 大量请求时建议选择性录制

3. **数据存储**
   - 响应数据完整保存在extractedData中
   - 可通过变量名在后续步骤中访问

4. **超时设置**
   - 回放时默认等待30秒
   - 超时后会报错但不中断后续步骤

## 多语言支持

| 语言 | XHR监听按钮 | 对话框标题 |
|------|------------|-----------|
| 简体中文 | XHR监听 | XHR请求监听 |
| 繁体中文 | XHR監聽 | XHR請求監聽 |
| English | XHR Monitor | XHR Request Monitoring |
| Español | Monitor XHR | Monitoreo de solicitudes XHR |
| 日本語 | XHR監視 | XHRリクエスト監視 |

## 未来扩展

1. 请求过滤功能（按URL、方法、状态码过滤）
2. 请求详情预览（查看完整的请求/响应数据）
3. 请求重放功能（手动触发特定请求）
4. WebSocket支持
5. GraphQL支持

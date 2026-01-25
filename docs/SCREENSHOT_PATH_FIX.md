# 截图路径返回修复

## 问题描述

用户通过 MCP 调用 `browser_take_screenshot` 时，虽然成功捕获了截图，但响应中没有返回截图的保存路径：

```json
{
  "jsonrpc": "2.0",
  "id": 30,
  "method": "tools/call",
  "params": {
    "name": "browser_take_screenshot",
    "arguments": {}
  }
}
```

**原始响应：**
```json
{
  "jsonrpc": "2.0",
  "id": 30,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Successfully captured screenshot (135924 bytes)"
      }
    ]
  }
}
```

**问题：** 
- ✅ 截图成功（135924 bytes）
- ❌ 没有返回截图路径
- ❌ 用户不知道截图保存在哪里

## 根本原因

### 原有实现

`Screenshot` 函数只是将截图数据保存在内存中（`[]byte`），并没有写入文件系统：

```go
// 原有实现（backend/executor/operations.go）
func (e *Executor) Screenshot(ctx context.Context, opts *ScreenshotOptions) (*OperationResult, error) {
    // ... 截图逻辑 ...
    
    data, err := page.Screenshot(...)
    
    return &OperationResult{
        Success: true,
        Message: fmt.Sprintf("Successfully captured screenshot (%d bytes)", len(data)),
        Data: map[string]interface{}{
            "data":   data,     // 只有字节数据
            "format": opts.Format,
            "size":   len(data),
            // ❌ 没有 "path" 字段
        },
    }, nil
}
```

### MCP 返回逻辑

MCP 工具只返回了消息文本，没有包含路径信息：

```go
// 原有 MCP 处理函数
handler := func(ctx context.Context, request mcpgo.CallToolRequest) (*mcpgo.CallToolResult, error) {
    result, err := r.executor.Screenshot(ctx, opts)
    if err != nil {
        return mcpgo.NewToolResultError(err.Error()), nil
    }
    
    // ❌ 只返回 message，丢失了路径信息
    return mcpgo.NewToolResultText(result.Message), nil
}
```

## 实施的修复

### 1. 添加文件保存逻辑

**文件：** `backend/executor/operations.go`

#### 添加保存方法

```go
// saveScreenshot 将截图数据保存到文件
func (e *Executor) saveScreenshot(ctx context.Context, data []byte, format string) (string, error) {
    // 创建 screenshots 目录
    screenshotsDir := "screenshots"
    if err := os.MkdirAll(screenshotsDir, 0755); err != nil {
        return "", fmt.Errorf("failed to create screenshots directory: %w", err)
    }

    // 生成文件名：screenshot_YYYYMMDD_HHMMSS.{format}
    timestamp := time.Now().Format("20060102_150405")
    extension := format
    if extension == "jpg" {
        extension = "jpeg"
    }
    filename := fmt.Sprintf("screenshot_%s.%s", timestamp, extension)
    filepath := filepath.Join(screenshotsDir, filename)

    // 保存文件
    if err := os.WriteFile(filepath, data, 0644); err != nil {
        return "", fmt.Errorf("failed to write screenshot file: %w", err)
    }

    logger.Info(ctx, "Screenshot saved to: %s", filepath)
    return filepath, nil
}
```

#### 修改 Screenshot 函数

```go
func (e *Executor) Screenshot(ctx context.Context, opts *ScreenshotOptions) (*OperationResult, error) {
    // ... 截图逻辑 ...
    
    data, err := page.Screenshot(...)
    
    // ✅ 保存截图到文件
    screenshotPath, saveErr := e.saveScreenshot(ctx, data, opts.Format)
    if saveErr != nil {
        logger.Warn(ctx, "Failed to save screenshot to file: %v", saveErr)
    }

    resultData := map[string]interface{}{
        "data":   data,
        "format": opts.Format,
        "size":   len(data),
    }
    
    // ✅ 添加路径信息
    if screenshotPath != "" {
        resultData["path"] = screenshotPath
    }

    message := fmt.Sprintf("Successfully captured screenshot (%d bytes)", len(data))
    if screenshotPath != "" {
        message = fmt.Sprintf("Successfully captured screenshot (%d bytes) and saved to: %s", 
                              len(data), screenshotPath)
    }

    return &OperationResult{
        Success:   true,
        Message:   message,
        Timestamp: time.Now(),
        Data:      resultData,
    }, nil
}
```

### 2. 更新 MCP 返回逻辑

**文件：** `backend/executor/mcp_tools.go`

```go
handler := func(ctx context.Context, request mcpgo.CallToolRequest) (*mcpgo.CallToolResult, error) {
    // ... 参数处理 ...
    
    result, err := r.executor.Screenshot(ctx, opts)
    if err != nil {
        return mcpgo.NewToolResultError(err.Error()), nil
    }

    // ✅ 构建返回消息，包含路径信息
    message := result.Message
    if path, ok := result.Data["path"].(string); ok && path != "" {
        // 获取绝对路径
        absPath, err := filepath.Abs(path)
        if err == nil {
            message = fmt.Sprintf("%s\nPath: %s", result.Message, absPath)
        }
    }

    return mcpgo.NewToolResultText(message), nil
}
```

## 修复后的效果

### 新的响应格式

```json
{
  "jsonrpc": "2.0",
  "id": 30,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Successfully captured screenshot (135924 bytes) and saved to: screenshots/screenshot_20260125_140532.png\nPath: /root/code/browserpilot/screenshots/screenshot_20260125_140532.png"
      }
    ]
  }
}
```

### 关键改进

| 项目 | 修复前 | 修复后 |
|------|--------|--------|
| **文件保存** | ❌ 不保存 | ✅ 保存到 `screenshots/` 目录 |
| **文件命名** | - | ✅ `screenshot_YYYYMMDD_HHMMSS.{format}` |
| **相对路径** | - | ✅ `screenshots/screenshot_20260125_140532.png` |
| **绝对路径** | ❌ 无 | ✅ `/root/code/browserpilot/screenshots/...` |
| **消息内容** | 只有大小 | ✅ 大小 + 路径 |

## 文件组织

### 截图目录结构

```
browserpilot/
├── screenshots/           ← 新创建的目录
│   ├── screenshot_20260125_140532.png
│   ├── screenshot_20260125_140545.png
│   └── screenshot_20260125_141203.jpeg
├── backend/
├── frontend/
└── ...
```

### 文件命名规则

| 格式 | 示例 | 时间格式 |
|------|------|----------|
| PNG | `screenshot_20260125_140532.png` | `YYYYMMDD_HHMMSS` |
| JPEG | `screenshot_20260125_140545.jpeg` | `YYYYMMDD_HHMMSS` |
| JPG | `screenshot_20260125_141203.jpeg` | `YYYYMMDD_HHMMSS` (自动转为 .jpeg) |

**注意：** `jpg` 格式会自动转换为 `jpeg` 扩展名。

## 使用示例

### 1. 默认截图（当前视口，PNG）

**请求：**
```json
{
  "method": "tools/call",
  "params": {
    "name": "browser_take_screenshot",
    "arguments": {}
  }
}
```

**响应：**
```
Successfully captured screenshot (135924 bytes) and saved to: screenshots/screenshot_20260125_140532.png
Path: /root/code/browserpilot/screenshots/screenshot_20260125_140532.png
```

### 2. 全页截图（JPEG）

**请求：**
```json
{
  "method": "tools/call",
  "params": {
    "name": "browser_take_screenshot",
    "arguments": {
      "full_page": true,
      "format": "jpeg"
    }
  }
}
```

**响应：**
```
Successfully captured screenshot (458792 bytes) and saved to: screenshots/screenshot_20260125_140545.jpeg
Path: /root/code/browserpilot/screenshots/screenshot_20260125_140545.jpeg
```

### 3. 在脚本中使用

```bash
# 调用截图命令
response=$(curl -X POST http://localhost:8080/api/v1/mcp/message \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "browser_take_screenshot",
      "arguments": {"full_page": true}
    }
  }')

# 提取路径
screenshot_path=$(echo "$response" | jq -r '.result.content[0].text' | grep -oP 'Path: \K.*')
echo "Screenshot saved to: $screenshot_path"

# 使用截图文件
open "$screenshot_path"  # macOS
# 或
xdg-open "$screenshot_path"  # Linux
```

## 错误处理

### 保存失败时的行为

如果保存文件失败（例如权限问题），函数会：
1. ✅ 记录警告日志
2. ✅ 继续返回成功（因为截图本身成功了）
3. ✅ 不包含 `path` 字段

```go
screenshotPath, saveErr := e.saveScreenshot(ctx, data, opts.Format)
if saveErr != nil {
    logger.Warn(ctx, "Failed to save screenshot to file: %v", saveErr)
    // 继续执行，只是没有路径
}
```

**这样设计的原因：**
- 截图的核心功能是**捕获**图像数据
- 文件保存是**便利功能**
- 即使保存失败，图像数据仍在内存中可用（API 返回）

### 权限问题

如果无法创建 `screenshots/` 目录：

```
[WARN] Failed to save screenshot to file: failed to create screenshots directory: permission denied
```

**解决方法：**
```bash
# 1. 检查当前目录权限
ls -ld .

# 2. 创建目录并设置权限
mkdir -p screenshots
chmod 755 screenshots

# 3. 或者在启动时使用有写权限的目录
cd /tmp && ./browserwing
```

## 配置选项（未来扩展）

虽然当前实现将截图保存到固定的 `screenshots/` 目录，但未来可以考虑添加配置：

```toml
[screenshots]
directory = "/var/browserwing/screenshots"
filename_pattern = "screenshot_{timestamp}.{format}"
max_age_days = 7  # 自动清理旧截图
```

## 相关文件修改

### 1. backend/executor/operations.go

**新增：**
- `saveScreenshot()` 方法（保存截图到文件）

**修改：**
- `Screenshot()` 方法（调用 saveScreenshot 并在结果中包含路径）
- 添加 `os` 和 `path/filepath` 导入

### 2. backend/executor/mcp_tools.go

**修改：**
- `registerScreenshotTool()` 的 handler 函数（在返回消息中包含绝对路径）
- 添加 `path/filepath` 导入

## 测试验证

### 场景 1: 基本截图

```bash
# 1. 启动浏览器并导航
curl -X POST .../browser_navigate -d '{"url": "https://example.com"}'

# 2. 截图
curl -X POST .../browser_take_screenshot

# 3. 验证文件存在
ls -lh screenshots/screenshot_*.png

# 预期：✅ 文件存在且可访问
```

### 场景 2: 全页截图（JPEG）

```bash
curl -X POST .../browser_take_screenshot \
  -d '{"full_page": true, "format": "jpeg"}'

ls -lh screenshots/screenshot_*.jpeg
```

### 场景 3: 多次截图

```bash
# 连续3次截图
for i in {1..3}; do
  curl -X POST .../browser_take_screenshot
  sleep 2
done

# 验证文件名不重复
ls -1 screenshots/
# 预期：3个不同的文件（时间戳不同）
```

### 场景 4: 使用测试脚本

```bash
cd /root/code/browserpilot/test
./browserwing-test --port 18080 &

# 使用 jq 提取路径
curl -s -X POST http://localhost:18080/api/v1/mcp/message \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "browser_take_screenshot",
      "arguments": {}
    }
  }' | jq -r '.result.content[0].text'
```

## 日志输出

### 成功时

```
[INFO] Screenshot saved to: screenshots/screenshot_20260125_140532.png
```

### 保存失败时

```
[WARN] Failed to save screenshot to file: failed to create screenshots directory: permission denied
```

## 相关文档

- [MCP 集成文档](./MCP_INTEGRATION.md)
- [MCP 测试指南](./MCP_TESTING_GUIDE.md)
- [Text 节点点击修复](./TEXT_NODE_CLICK_FIX.md)

## 未来改进

### 1. 云存储支持

```go
// 支持上传到 S3/OSS
if config.Screenshots.CloudStorage {
    url := uploadToCloud(data)
    resultData["cloud_url"] = url
}
```

### 2. 自动清理

```go
// 清理 N 天前的截图
func (e *Executor) cleanupOldScreenshots(days int) {
    // 实现清理逻辑
}
```

### 3. 截图压缩

```go
// 自动压缩大尺寸截图
if len(data) > 1*1024*1024 { // > 1MB
    data = compressImage(data, quality: 60)
}
```

## 总结

通过添加 `saveScreenshot` 方法并修改 `Screenshot` 和 MCP 工具的返回逻辑，成功实现了：

✅ **保存截图到文件**（`screenshots/` 目录）  
✅ **返回相对路径**（`screenshots/screenshot_20260125_140532.png`）  
✅ **返回绝对路径**（`/root/code/browserpilot/screenshots/...`）  
✅ **带时间戳的文件名**（避免覆盖）  
✅ **优雅的错误处理**（保存失败不影响截图功能）  

现在用户可以清楚地知道截图保存在哪里，方便后续使用和分享！📸🎉

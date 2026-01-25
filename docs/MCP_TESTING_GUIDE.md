# BrowserWing MCP 测试指南

## 概述

BrowserWing 提供了完整的测试框架，用于验证所有 MCP 命令的功能。测试框架位于 `test/` 目录。

## 快速开始

### 一键测试

```bash
cd test
./build-and-test.sh
```

这将：
1. ✅ 构建测试用的二进制文件
2. ✅ 启动测试服务器（端口 18080）
3. ✅ 自动运行所有测试
4. ✅ 生成测试报告
5. ✅ 自动清理环境

### 输出示例

```
╔════════════════════════════════════════╗
║   BrowserWing MCP 测试脚本             ║
╚════════════════════════════════════════╝

[INFO] 检查依赖...
[INFO] ✓ 依赖检查通过
[INFO] 构建二进制文件...
[INFO] ✓ 构建完成
[INFO] 启动测试服务器 (端口: 18080)...
[INFO] ✓ 服务器启动成功

[INFO] =========================================
[INFO] 运行基础 API 测试
[INFO] =========================================
[INFO] ✓ 健康检查 成功
[INFO] ✓ 获取浏览器实例列表 成功

[INFO] =========================================
[INFO] 运行 MCP 命令测试
[INFO] =========================================
[INFO] ✓ 导航到页面 成功
[INFO] ✓ 获取页面快照 成功
[INFO] ✓ 获取页面信息 成功
[INFO] ✓ 页面截图 成功
[INFO] ✓ 执行JavaScript 成功
[INFO] ✓ 滚动页面 成功
[INFO] ✓ 等待元素 成功
[INFO] ✓ 调整窗口大小 成功
[INFO] ✓ 获取控制台消息 成功
[INFO] ✓ 获取网络请求 成功
[INFO] ✓ 获取标签页列表 成功

[INFO] =========================================
[INFO] MCP 测试结果统计
[INFO] =========================================
[INFO] 成功: 11
[WARN] 失败: 0
[INFO] 跳过: 4
[INFO] 总计: 15

[INFO] =========================================
[INFO] 测试完成
[INFO] =========================================
[INFO] ✓ 所有测试通过
[INFO] 二进制文件: /path/to/test/browserwing-test
[INFO] 数据目录: /path/to/test/data
[INFO] 服务器日志: /path/to/test/server.log
```

## 测试文件结构

```
test/
├── build-and-test.sh       # 主测试脚本
├── run-quick-test.sh       # 快速测试脚本
├── test-config.json        # 测试配置
├── README.md               # 测试目录说明
├── TESTING.md              # 详细测试指南
├── .gitignore              # Git 忽略规则
│
├── browserwing-test        # 构建的测试二进制（生成）
├── server.log              # 服务器日志（生成）
└── data/                   # 测试数据目录（生成）
```

## 测试脚本详解

### 1. build-and-test.sh

**主要功能：**
- 依赖检查（Go、curl、jq）
- 构建二进制文件
- 启动测试服务器
- 运行完整测试套件
- 生成测试报告
- 自动清理

**使用选项：**
```bash
# 显示帮助
./build-and-test.sh --help

# 跳过构建步骤
./build-and-test.sh --skip-build

# 测试后清理数据
./build-and-test.sh --clean

# 组合使用
./build-and-test.sh --skip-build --clean
```

### 2. run-quick-test.sh

**快速测试核心功能：**
- 健康检查
- 导航测试
- 快照测试
- 截图测试

**使用场景：**
- 快速验证基本功能
- 开发过程中的冒烟测试
- CI/CD 中的预检查

```bash
# 前提：服务器已运行
./browserwing-test --port 18080 &

# 运行快速测试
./run-quick-test.sh
```

## 测试覆盖

### ✅ 核心功能测试（11项）

| 命令 | 功能 | 状态 |
|------|------|------|
| `browser_navigate` | 导航到页面 | ✅ |
| `browser_snapshot` | 获取页面快照 | ✅ |
| `browser_get_page_info` | 获取页面信息 | ✅ |
| `browser_take_screenshot` | 页面截图 | ✅ |
| `browser_evaluate` | 执行 JavaScript | ✅ |
| `browser_scroll` | 滚动页面 | ✅ |
| `browser_wait_for` | 等待元素 | ✅ |
| `browser_resize` | 调整窗口大小 | ✅ |
| `browser_console_messages` | 获取控制台消息 | ✅ |
| `browser_network_requests` | 获取网络请求 | ✅ |
| `browser_tabs` | 标签页管理 | ✅ |

### ⏭️ 条件跳过测试（4项）

| 命令 | 原因 |
|------|------|
| `browser_extract` | 需要 LLM 配置 |
| `browser_click` | 需要有效的选择器 |
| `browser_type` | 需要有效的选择器 |
| `browser_fill_form` | 需要有效的表单数据 |

### 📋 其他命令（可手动测试）

- `browser_select` - 下拉框选择
- `browser_press_key` - 按键操作
- `browser_drag` - 拖拽操作
- `browser_close` - 关闭页面
- `browser_file_upload` - 文件上传
- `browser_handle_dialog` - 对话框处理

## 手动测试

### 测试单个 MCP 命令

```bash
# 1. 启动服务器
cd test
./browserwing-test --port 18080 --data-dir ./data &

# 2. 等待服务器就绪
sleep 3

# 3. 测试导航
curl -X POST http://localhost:18080/api/v1/mcp/message \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "browser_navigate",
      "arguments": {
        "url": "https://example.com"
      }
    }
  }' | jq

# 4. 测试快照
curl -X POST http://localhost:18080/api/v1/mcp/message \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "browser_snapshot",
      "arguments": {}
    }
  }' | jq

# 5. 测试截图
curl -X POST http://localhost:18080/api/v1/mcp/message \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "browser_take_screenshot",
      "arguments": {
        "full_page": false
      }
    }
  }' | jq
```

## CI/CD 集成

### GitHub Actions 示例

```yaml
name: MCP Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test-mcp:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
    
    - name: Setup Go
      uses: actions/setup-go@v4
      with:
        go-version: '1.21'
    
    - name: Install Chrome
      run: |
        wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
        sudo sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list'
        sudo apt-get update
        sudo apt-get install -y google-chrome-stable
    
    - name: Install jq
      run: sudo apt-get install -y jq
    
    - name: Run MCP Tests
      run: |
        cd test
        ./build-and-test.sh --clean
    
    - name: Upload test logs
      if: failure()
      uses: actions/upload-artifact@v3
      with:
        name: test-logs
        path: test/server.log
```

## 故障排除

### 问题 1: 端口被占用

```bash
# 检查端口占用
lsof -i :18080

# 杀死占用进程
kill -9 <PID>

# 或更换端口（修改脚本中的 TEST_PORT）
```

### 问题 2: Chrome 未找到

```bash
# 检查 Chrome 路径
which google-chrome || which chromium-browser

# 设置环境变量
export CHROME_PATH=/usr/bin/google-chrome

# 或创建配置文件
cat > test/config.local.toml << EOF
[browser]
bin_path = "/usr/bin/google-chrome"
EOF
```

### 问题 3: 测试超时

```bash
# 查看服务器日志
cat test/server.log

# 增加超时时间（修改脚本）
# 或手动启动后测试
./test/browserwing-test --port 18080 &
sleep 5
./test/run-quick-test.sh
```

### 问题 4: "no active page" 错误

**原因：** 页面未正确打开或依赖测试未运行

**解决：** 确保先执行 `browser_navigate`

```bash
# 正确的测试顺序
# 1. 导航
browser_navigate

# 2. 其他操作
browser_snapshot
browser_click
...
```

## 性能基准

在标准硬件上的典型测试时间：

| 阶段 | 时间 |
|------|------|
| 构建 | 10-20 秒 |
| 服务器启动 | 2-5 秒 |
| 基础 API 测试 | 1-2 秒 |
| MCP 命令测试 | 15-30 秒 |
| **总计** | **30-60 秒** |

## 自定义测试

### 添加新的测试用例

编辑 `test-config.json`：

```json
{
  "mcp_tests": [
    {
      "name": "我的自定义测试",
      "tool": "browser_evaluate",
      "args": {
        "script": "console.log('test')"
      },
      "enabled": true,
      "depends_on": ["browser_navigate"]
    }
  ]
}
```

### 创建自定义测试脚本

```bash
# test/my-custom-test.sh
#!/bin/bash

source ./build-and-test.sh

# 运行自定义测试场景
test_custom_workflow() {
    log_test "自定义工作流测试"
    
    # 步骤 1: 导航
    test_mcp "导航到登录页" "browser_navigate" \
        '{"url":"https://example.com/login"}'
    
    # 步骤 2: 填写表单
    test_mcp "填写用户名" "browser_type" \
        '{"selector":"#username","text":"testuser"}'
    
    # 步骤 3: 提交
    test_mcp "点击登录" "browser_click" \
        '{"selector":"#login-btn"}'
    
    # 验证结果
    # ...
}

test_custom_workflow
```

## 最佳实践

### 1. 开发时使用快速测试

```bash
# 修改代码后快速验证
./run-quick-test.sh
```

### 2. 提交前运行完整测试

```bash
# 确保所有功能正常
./build-and-test.sh --clean
```

### 3. CI/CD 中自动化测试

在 PR 和提交时自动运行测试

### 4. 保持测试数据清洁

```bash
# 定期清理测试数据
./build-and-test.sh --clean
```

### 5. 监控测试日志

```bash
# 实时查看日志
tail -f test/server.log
```

## 相关文档

- [测试目录 README](../test/README.md)
- [详细测试指南](../test/TESTING.md)
- [MCP 集成文档](./MCP_INTEGRATION.md)
- [浏览器命令参考](./BROWSER_COMMANDS_QUICK_REFERENCE.md)
- [HTTP API 文档](./EXECUTOR_HTTP_API.md)

## 贡献测试

欢迎贡献新的测试用例！

1. Fork 项目
2. 添加测试用例到 `test-config.json`
3. 更新测试脚本（如需要）
4. 提交 PR

## 总结

BrowserWing 的 MCP 测试框架提供：

✅ **一键测试** - 自动构建、测试、清理  
✅ **完整覆盖** - 测试所有核心 MCP 命令  
✅ **CI/CD 就绪** - 易于集成到自动化流程  
✅ **详细报告** - 清晰的测试结果和日志  
✅ **易于扩展** - 支持自定义测试场景  

让 MCP 功能的验证变得简单可靠！🎉

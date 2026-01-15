# Executor 工具配置集成

## 概述

将 Executor 工具集成到统一的工具配置系统中，使其可以在前端进行展示、启用/禁用等管理操作。

## 背景

### 之前的问题

1. **Executor 工具独立管理**
   - Executor 工具（browser_navigate, browser_click 等）与其他预设工具分离
   - 无法在前端统一管理
   - 无法单独启用/禁用某个 Executor 工具

2. **配置不一致**
   - 预设工具有配置系统
   - 脚本工具有配置系统
   - Executor 工具没有配置 → 不一致

3. **前端展示问题**
   - 无法在工具管理页面看到 Executor 工具
   - 无法了解每个工具的状态
   - 无法进行细粒度的工具控制

## 解决方案

### 1. 工具配置初始化

添加 `initExecutorToolConfigs()` 函数，在 Agent 启动时自动创建 Executor 工具配置。

```go
func (am *AgentManager) initExecutorToolConfigs() error {
    // 获取 Executor 工具元数据
    executorTools := executor.GetExecutorToolsMetadata()
    
    for _, meta := range executorTools {
        // 检查是否已存在配置
        existingConfig, err := am.db.GetToolConfig(meta.Name)
        if err == nil && existingConfig != nil {
            continue // 已存在，跳过
        }
        
        // 创建新的工具配置
        config := &models.ToolConfig{
            ID:          meta.Name,
            Name:        meta.Name,
            Type:        models.ToolTypePreset, // ✅ 标记为预设工具
            Description: meta.Description,
            Enabled:     true, // 默认启用
            Parameters:  make(map[string]interface{}),
        }
        
        // 添加分类信息
        if meta.Category != "" {
            config.Parameters["category"] = meta.Category
        }
        
        // 保存到数据库
        am.db.SaveToolConfig(config)
    }
    
    return nil
}
```

### 2. 工具注册时检查启用状态

更新 `initExecutorTools()` 函数，在注册工具时检查配置的启用状态。

```go
func (am *AgentManager) initExecutorTools() error {
    executorTools := executor.GetExecutorToolsMetadata()
    
    // 获取工具配置
    toolConfigs, _ := am.db.ListToolConfigs()
    configMap := make(map[string]*models.ToolConfig)
    for _, cfg := range toolConfigs {
        if cfg.Type == models.ToolTypePreset {
            configMap[cfg.ID] = cfg
        }
    }
    
    for _, meta := range executorTools {
        // ✅ 检查工具是否被启用
        if config, ok := configMap[meta.Name]; ok && !config.Enabled {
            logger.Info(am.ctx, "Executor tool %s is disabled, skipping", meta.Name)
            continue
        }
        
        // 注册工具
        tool := &MCPTool{
            name:        meta.Name,
            description: meta.Description,
            inputSchema: buildInputSchemaFromMetadata(meta),
            mcpServer:   am.mcpServer,
        }
        am.toolReg.Register(tool)
    }
    
    return nil
}
```

### 3. Agent 启动顺序

```go
// 1. 首先初始化工具配置（创建数据库记录）
if err := am.initExecutorToolConfigs(); err != nil {
    logger.Warn(am.ctx, "Failed to initialize executor tool configs: %v", err)
}

// 2. 然后注册工具到 MCP（根据配置的启用状态）
if err := am.initExecutorTools(); err != nil {
    logger.Warn(am.ctx, "Failed to initialize executor tools: %v", err)
}
```

## Executor 工具列表

集成的 10 个 Executor 工具：

### Navigation (导航)
1. **browser_navigate** - 导航到 URL

### Interaction (交互)
2. **browser_click** - 点击元素
3. **browser_type** - 输入文本
4. **browser_select** - 选择下拉选项

### Capture (捕获)
5. **browser_screenshot** - 截图

### Data (数据)
6. **browser_extract** - 提取数据

### Analysis (分析)
7. **browser_get_semantic_tree** - 获取语义树
8. **browser_get_page_info** - 获取页面信息

### Synchronization (同步)
9. **browser_wait_for** - 等待元素状态

### Navigation (导航)
10. **browser_scroll** - 滚动页面

## 工具配置结构

每个 Executor 工具的配置：

```json
{
  "id": "browser_navigate",
  "name": "browser_navigate",
  "type": "preset",
  "description": "Navigate to a URL in the browser",
  "enabled": true,
  "parameters": {
    "category": "Navigation"
  }
}
```

## 前端集成

### 工具管理页面

前端可以通过 API 获取所有工具配置，包括 Executor 工具：

```typescript
// GET /api/tools/configs
{
  "tools": [
    // 预设工具
    {
      "id": "web_search",
      "type": "preset",
      "enabled": true
    },
    // Executor 工具（也是预设类型）
    {
      "id": "browser_navigate",
      "type": "preset",
      "enabled": true,
      "parameters": {
        "category": "Navigation"
      }
    },
    // 脚本工具
    {
      "id": "script_123",
      "type": "script",
      "enabled": true
    }
  ]
}
```

### UI 展示建议

可以按分类展示 Executor 工具：

```
工具管理
├── 预设工具
│   ├── web_search (搜索)
│   └── ...
├── 浏览器工具 (Browser Tools)
│   ├── 导航 (Navigation)
│   │   ├── browser_navigate [✓]
│   │   └── browser_scroll [✓]
│   ├── 交互 (Interaction)
│   │   ├── browser_click [✓]
│   │   ├── browser_type [✓]
│   │   └── browser_select [✓]
│   ├── 数据 (Data)
│   │   └── browser_extract [✓]
│   ├── 分析 (Analysis)
│   │   ├── browser_get_semantic_tree [✓]
│   │   └── browser_get_page_info [✓]
│   ├── 捕获 (Capture)
│   │   └── browser_screenshot [✓]
│   └── 同步 (Synchronization)
│       └── browser_wait_for [✓]
└── 脚本工具
    └── ...
```

## 使用场景

### 场景 1: 禁用某个工具

如果用户不想让 AI 使用截图功能：

1. 在前端工具管理页面找到 `browser_screenshot`
2. 点击禁用开关
3. 重启 Agent 或重新加载工具
4. AI 将无法再使用 `browser_screenshot` 工具

### 场景 2: 只启用基础工具

可以只启用最基础的工具，禁用高级功能：

```
启用:
- browser_navigate
- browser_click
- browser_type

禁用:
- browser_extract
- browser_get_semantic_tree
- browser_screenshot
```

### 场景 3: 按项目定制工具集

不同项目可能需要不同的工具集：

**项目 A (简单导航)**：
- browser_navigate ✓
- browser_click ✓
- browser_get_page_info ✓

**项目 B (数据抓取)**：
- browser_navigate ✓
- browser_wait_for ✓
- browser_extract ✓
- browser_screenshot ✓

## API 接口

### 获取所有工具配置
```
GET /api/tools/configs
```

### 更新工具配置
```
PUT /api/tools/configs/{tool_id}
{
  "enabled": false
}
```

### 批量更新工具配置
```
POST /api/tools/configs/batch
{
  "updates": [
    {"id": "browser_screenshot", "enabled": false},
    {"id": "browser_extract", "enabled": false}
  ]
}
```

## 数据库迁移

### 首次启动

首次启动时，系统会自动为所有 Executor 工具创建配置记录：

```sql
INSERT INTO tool_configs (id, name, type, description, enabled, parameters) 
VALUES 
  ('browser_navigate', 'browser_navigate', 'preset', 'Navigate to a URL in the browser', true, '{"category":"Navigation"}'),
  ('browser_click', 'browser_click', 'preset', 'Click an element on the page', true, '{"category":"Interaction"}'),
  ...
```

### 后续启动

后续启动时，检查配置是否已存在，只创建缺失的配置。

## 优势

### 1. 统一管理
- 所有工具（预设、Executor、脚本）都在同一个系统中管理
- 统一的配置接口和数据结构

### 2. 灵活控制
- 可以单独启用/禁用任何工具
- 支持细粒度的权限控制
- 适应不同的使用场景

### 3. 前端友好
- 工具配置可视化
- 直观的启用/禁用开关
- 按分类组织，易于查找

### 4. 可扩展
- 新增 Executor 工具时自动集成
- 支持为每个工具添加自定义参数
- 便于未来添加更多配置选项

## 兼容性

### 向后兼容
- 现有的 Executor 工具功能不变
- 默认全部启用，不影响现有用户
- API 接口保持兼容

### 数据迁移
- 首次启动自动创建配置
- 不影响现有数据
- 可以安全回滚

## 测试建议

### 功能测试
1. 启动服务，检查数据库中是否创建了 10 个 Executor 工具配置
2. 禁用某个工具，重启服务，验证该工具未被注册
3. 重新启用工具，验证工具恢复正常

### API 测试
```bash
# 获取所有工具配置
curl http://localhost:8080/api/tools/configs

# 禁用 browser_screenshot
curl -X PUT http://localhost:8080/api/tools/configs/browser_screenshot \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'

# 验证工具列表
curl http://localhost:8080/api/tools/list
```

### 前端测试
1. 打开工具管理页面
2. 检查是否显示所有 Executor 工具
3. 测试启用/禁用开关
4. 验证分类显示是否正确

## 未来改进

### 1. 工具参数配置
为每个工具添加可配置的参数：

```json
{
  "id": "browser_navigate",
  "parameters": {
    "category": "Navigation",
    "default_timeout": 60,
    "default_wait_until": "load"
  }
}
```

### 2. 权限控制
为不同用户/角色设置不同的工具权限：

```json
{
  "id": "browser_screenshot",
  "permissions": {
    "admin": true,
    "user": false
  }
}
```

### 3. 使用统计
记录每个工具的使用频率和成功率：

```json
{
  "id": "browser_click",
  "stats": {
    "usage_count": 1234,
    "success_rate": 0.95
  }
}
```

## 总结

这次集成将 Executor 工具纳入统一的工具配置系统，实现了：

✅ **统一管理** - 所有工具类型使用相同的配置系统
✅ **前端可视化** - Executor 工具可以在前端展示和管理
✅ **灵活控制** - 支持单独启用/禁用每个工具
✅ **分类组织** - 按功能分类，便于管理
✅ **向后兼容** - 不影响现有功能
✅ **可扩展** - 便于未来添加更多配置选项

这为后续的工具管理和权限控制奠定了基础。

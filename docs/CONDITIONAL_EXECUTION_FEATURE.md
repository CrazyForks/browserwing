# 脚本条件执行功能

## 功能概述

为脚本的每个 action 添加了条件执行能力，允许基于变量值动态决定是否执行某个操作步骤。这为脚本提供了更强大的控制流能力，支持条件判断、分支逻辑等高级场景。

## 功能特性

1. **条件定义**：为每个 action 设置执行条件
2. **多种操作符**：支持 =, !=, >, <, >=, <=, in, not_in, contains, not_contains, exists, not_exists
3. **变量支持**：基于脚本预设变量或提取的数据进行条件判断
4. **动态跳过**：条件不满足时自动跳过该 action
5. **可视化编辑**：前端提供友好的条件设置界面

## 技术实现

### 后端修改

#### 1. 数据模型 (`backend/models/script.go`)

在 `ScriptAction` 结构体中添加了 `Condition` 字段：

```go
// ActionCondition 操作执行条件
type ActionCondition struct {
    Variable string `json:"variable"`          // 变量名
    Operator string `json:"operator"`          // 操作符: =, !=, >, <, >=, <=, in, not_in, exists, not_exists
    Value    string `json:"value"`             // 比较值
    Enabled  bool   `json:"enabled,omitempty"` // 是否启用条件（默认false）
}

type ScriptAction struct {
    // ... 其他字段
    
    // ⑤ 条件执行（基于变量的条件判断）
    Condition *ActionCondition `json:"condition,omitempty"`
}
```

#### 2. 回放器逻辑 (`backend/services/browser/player.go`)

**变量上下文管理**：

在 `PlayScript` 函数中添加了变量上下文，包含：
- 脚本的预设变量
- 执行过程中提取的数据

```go
// 初始化变量上下文（包含脚本预设变量）
variables := make(map[string]string)
if script.Variables != nil {
    for k, v := range script.Variables {
        variables[k] = v
        logger.Info(ctx, "Initialize variable: %s = %s", k, v)
    }
}

// 执行每个操作
for i, action := range script.Actions {
    // 检查条件执行
    if action.Condition != nil && action.Condition.Enabled {
        shouldExecute, err := p.evaluateCondition(ctx, action.Condition, variables)
        if err != nil {
            logger.Warn(ctx, "Failed to evaluate condition: %v", err)
        } else if !shouldExecute {
            logger.Info(ctx, "Skipping action due to condition not met")
            continue
        }
    }
    
    // 执行 action ...
    
    // 如果 action 提取了数据，更新变量上下文
    if action.VariableName != "" && p.extractedData[action.VariableName] != nil {
        variables[action.VariableName] = fmt.Sprintf("%v", p.extractedData[action.VariableName])
    }
}
```

**条件评估函数**：

```go
func (p *Player) evaluateCondition(ctx context.Context, condition *models.ActionCondition, variables map[string]string) (bool, error)
```

支持的操作符：

| 操作符 | 说明 | 示例 |
|--------|------|------|
| `=` 或 `==` | 等于 | `username = admin` |
| `!=` | 不等于 | `status != pending` |
| `>` | 大于（数值/字符串） | `count > 10` |
| `<` | 小于（数值/字符串） | `age < 18` |
| `>=` | 大于等于 | `score >= 60` |
| `<=` | 小于等于 | `price <= 100` |
| `in` | 在列表中（逗号分隔） | `role in admin,editor,author` |
| `not_in` | 不在列表中 | `status not_in deleted,archived` |
| `contains` | 包含子串 | `message contains error` |
| `not_contains` | 不包含子串 | `text not_contains spam` |
| `exists` | 变量存在 | `username exists` |
| `not_exists` | 变量不存在 | `error not_exists` |

**数值比较**：
- 自动尝试将字符串转换为数值进行比较
- 如果转换失败，则进行字符串比较

### 前端修改

#### 1. 类型定义 (`frontend/src/api/client.ts`)

```typescript
export interface ScriptAction {
  // ... 其他字段
  
  // 条件执行
  condition?: {
    variable: string      // 变量名
    operator: string      // 操作符
    value: string         // 比较值
    enabled?: boolean     // 是否启用条件
  }
}
```

#### 2. 条件编辑界面 (`frontend/src/pages/ScriptManager.tsx`)

**编辑模式**：

在 `SortableActionItem` 组件中添加了条件编辑区域：
- 启用/禁用条件的开关
- 变量名输入框
- 操作符下拉选择
- 比较值输入框（exists/not_exists 时禁用）
- 使用示例提示

```typescript
{/* 条件执行设置 */}
<div className="pt-3 border-t border-gray-200 dark:border-gray-700">
  <div className="flex items-center justify-between mb-2">
    <label className="text-sm font-medium">条件执行</label>
    <label className="flex items-center cursor-pointer">
      <input type="checkbox" checked={action.condition?.enabled || false} />
      <span>启用</span>
    </label>
  </div>
  
  {action.condition?.enabled && (
    <div className="grid grid-cols-3 gap-2">
      {/* 变量名、操作符、值的输入 */}
    </div>
  )}
</div>
```

**查看模式**：

在 `ActionItemView` 组件中显示条件信息：
- 使用琥珀色背景突出显示
- 格式：`条件: variable operator value`

```typescript
{action.condition && action.condition.enabled && (
  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200">
    <span className="font-medium">条件:</span>
    <code>{action.condition.variable} {action.condition.operator} {action.condition.value}</code>
  </div>
)}
```

## 使用示例

### 示例 1：基于用户角色的条件执行

```json
{
  "type": "click",
  "selector": "#admin-panel",
  "condition": {
    "variable": "role",
    "operator": "=",
    "value": "admin",
    "enabled": true
  }
}
```

**说明**：只有当 `role` 变量等于 `admin` 时，才会点击管理面板按钮。

### 示例 2：基于数值判断

```json
{
  "type": "input",
  "selector": "#discount-code",
  "value": "VIP50",
  "condition": {
    "variable": "total_amount",
    "operator": ">",
    "value": "1000",
    "enabled": true
  }
}
```

**说明**：只有当总金额大于 1000 时，才输入折扣码。

### 示例 3：检查变量是否存在

```json
{
  "type": "navigate",
  "url": "/login",
  "condition": {
    "variable": "auth_token",
    "operator": "not_exists",
    "value": "",
    "enabled": true
  }
}
```

**说明**：只有当 `auth_token` 不存在时，才跳转到登录页面。

### 示例 4：多值匹配

```json
{
  "type": "click",
  "selector": "#submit-button",
  "condition": {
    "variable": "status",
    "operator": "in",
    "value": "draft,pending,review",
    "enabled": true
  }
}
```

**说明**：当状态是 draft、pending 或 review 之一时，点击提交按钮。

## 完整工作流示例

### 场景：电商购物流程

```json
{
  "name": "智能购物流程",
  "variables": {
    "is_member": "true",
    "cart_total": "0"
  },
  "actions": [
    {
      "type": "navigate",
      "url": "https://example.com/products"
    },
    {
      "type": "click",
      "selector": "#add-to-cart"
    },
    {
      "type": "extract_text",
      "selector": "#cart-total",
      "variable_name": "cart_total"
    },
    {
      "type": "input",
      "selector": "#coupon-code",
      "value": "MEMBER20",
      "condition": {
        "variable": "is_member",
        "operator": "=",
        "value": "true",
        "enabled": true
      },
      "remark": "会员才输入优惠券"
    },
    {
      "type": "click",
      "selector": "#free-shipping",
      "condition": {
        "variable": "cart_total",
        "operator": ">=",
        "value": "99",
        "enabled": true
      },
      "remark": "满99才选择包邮"
    },
    {
      "type": "click",
      "selector": "#checkout"
    }
  ]
}
```

## 高级应用

### 1. 条件链

可以通过组合多个带条件的 action 实现复杂的逻辑：

```
Action 1: 提取用户等级 -> level
Action 2: if level = VIP -> 进入VIP页面
Action 3: if level = normal -> 进入普通页面
Action 4: if level not_exists -> 进入游客页面
```

### 2. 循环模拟

虽然不是真正的循环，但可以通过条件跳过来实现类似效果：

```
Action 1: 提取当前页码 -> page
Action 2: if page < 5 -> 点击下一页
Action 3: if page < 5 -> 等待加载
Action 4: if page < 5 -> 提取数据
```

### 3. 错误处理

```
Action 1: 提取错误信息 -> error_msg
Action 2: if error_msg exists -> 截图保存
Action 3: if error_msg exists -> 跳过后续操作
Action 4: if error_msg not_exists -> 继续正常流程
```

## 日志输出

启用条件执行时，回放器会输出详细日志：

```
[INFO] Initialize variable: role = admin
[INFO] [1/10] Execute action: navigate
[INFO] [2/10] Execute action: click
[INFO] Condition met, executing action: role = admin
[INFO] [3/10] Execute action: input
[INFO] Skipping action due to condition not met: status != pending
```

## 注意事项

1. **变量优先级**：
   - 脚本预设变量 < 提取的数据 < 外部传入参数

2. **条件评估失败**：
   - 如果变量不存在（exists/not_exists 除外），条件评估失败，跳过该 action
   - 日志会记录警告信息

3. **性能考虑**：
   - 条件判断开销很小，对性能影响可忽略
   - 建议合理使用，避免过度复杂的条件逻辑

4. **向后兼容**：
   - 现有脚本不受影响（condition 字段为可选）
   - 导入导出自动兼容

## 后续扩展

1. **复合条件**：支持 AND/OR 逻辑组合
2. **正则匹配**：支持正则表达式匹配
3. **循环结构**：真正的循环控制（while/for）
4. **条件模板**：常用条件模板库
5. **可视化流程图**：图形化展示脚本执行流程

## 测试建议

1. **基础条件测试**：
   - 测试所有操作符
   - 测试数值和字符串比较
   - 测试 exists/not_exists

2. **变量传递测试**：
   - 预设变量 -> 条件判断
   - 提取数据 -> 条件判断
   - 外部参数 -> 条件判断

3. **边界情况测试**：
   - 变量不存在
   - 空值比较
   - 特殊字符处理

4. **集成测试**：
   - 多个条件组合
   - 条件与变量配合
   - 完整业务流程

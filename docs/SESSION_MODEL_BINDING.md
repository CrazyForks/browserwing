# 会话模型绑定改进

## 概述

改进了 Agent Chat 的模型选择交互，解决了原有设计的歧义和不友好问题。

## 问题描述

### 旧设计的问题

**问题 1: 交互混乱**
- 会话中有一个 LLM 下拉框，看起来可以随时切换
- 实际上切换不起作用（或行为不明确）
- 用户不知道是否能切换，造成困惑

**问题 2: 概念歧义**
- 一个会话应该只使用一种模型（保持上下文一致性）
- 但 UI 暗示可以中途切换模型
- 导致用户对系统行为的预期与实际不符

**问题 3: 不够友好**
- 没有明确何时选择模型
- 没有明确模型选择的影响范围
- 只有一个模型时也显示下拉框

## 新设计方案

### 核心原则

1. ✅ **一个会话一个模型**：会话创建时绑定模型，之后不可更改
2. ✅ **智能显示**：只有一个模型时自动使用，无需用户选择
3. ✅ **明确提示**：新建会话时清楚说明模型选择的影响
4. ✅ **只读显示**：会话中只显示当前使用的模型（不可更改）

### 交互流程

#### 场景 1: 只有一个激活的模型

```
用户点击"新建会话"
    ↓
自动使用唯一的模型创建会话
    ↓
立即进入会话
```

#### 场景 2: 有多个激活的模型

```
用户点击"新建会话"
    ↓
显示模型选择对话框
    ↓
用户选择一个模型
    ↓
创建会话并绑定所选模型
    ↓
进入会话（显示只读的模型标签）
```

#### 场景 3: 没有激活的模型

```
用户点击"新建会话"（按钮禁用）
    ↓
提示用户去配置 LLM
```

## 实现细节

### 后端改动

#### 1. 模型结构添加 LLM 字段

**models/agent_session.go:**
```go
type AgentSession struct {
    ID          string    `json:"id"`
    LLMConfigID string    `json:"llm_config_id"` // 会话使用的LLM配置ID
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
}
```

**agent/agent.go (ChatSession):**
```go
type ChatSession struct {
    ID          string        `json:"id"`
    LLMConfigID string        `json:"llm_config_id"` // 会话使用的LLM配置ID
    Messages    []ChatMessage `json:"messages"`
    CreatedAt   time.Time     `json:"created_at"`
    UpdatedAt   time.Time     `json:"updated_at"`
}
```

#### 2. 创建会话 API 支持指定模型

**agent/handlers.go:**
```go
func (h *Handler) CreateSession(c *gin.Context) {
    var req struct {
        LLMConfigID string `json:"llm_config_id"` // LLM 配置 ID
    }
    
    // 尝试读取请求体（可选）
    c.ShouldBindJSON(&req)
    
    session := h.manager.CreateSession(req.LLMConfigID)
    
    c.JSON(http.StatusOK, gin.H{
        "session": session,
    })
}
```

**agent/agent.go:**
```go
func (am *AgentManager) CreateSession(llmConfigID string) *ChatSession {
    session := &ChatSession{
        ID:          uuid.New().String(),
        LLMConfigID: llmConfigID,  // 保存 LLM 配置 ID
        Messages:    []ChatMessage{},
        CreatedAt:   time.Now(),
        UpdatedAt:   time.Now(),
    }
    
    // 保存到数据库
    dbSession := &models.AgentSession{
        ID:          session.ID,
        LLMConfigID: llmConfigID,  // 持久化到数据库
        CreatedAt:   session.CreatedAt,
        UpdatedAt:   session.UpdatedAt,
    }
    // ...
    
    return session
}
```

### 前端改动

#### 1. 删除的状态变量

```typescript
// 删除 ❌
const [selectedLlm, setSelectedLlm] = useState<string>('')
const [showLlmDropdown, setShowLlmDropdown] = useState(false)
const llmDropdownRef = useRef<HTMLDivElement>(null)

// 新增 ✅
const [showNewSessionDialog, setShowNewSessionDialog] = useState(false)
const [selectedLlmForNewSession, setSelectedLlmForNewSession] = useState<string>('')
const newSessionDialogRef = useRef<HTMLDivElement>(null)
```

#### 2. 会话接口添加字段

```typescript
interface ChatSession {
  id: string
  llm_config_id: string  // 新增：会话使用的LLM配置ID
  messages: ChatMessage[]
  created_at: string
  updated_at: string
}
```

#### 3. 新建会话逻辑

```typescript
// 显示新建会话对话框
const showCreateSessionDialog = () => {
  const activeConfigs = llmConfigs.filter(c => c && c.id && c.is_active)
  
  // 如果只有一个模型，直接创建会话
  if (activeConfigs.length === 1) {
    createSession(activeConfigs[0].id)
    return
  }
  
  // 如果有多个模型，显示选择对话框
  if (activeConfigs.length > 1) {
    setSelectedLlmForNewSession(activeConfigs[0].id)
    setShowNewSessionDialog(true)
    return
  }
  
  // 如果没有模型，提示用户配置
  showToastMessage('请先配置 LLM', 'error')
}

// 创建新会话（带模型绑定）
const createSession = async (llmConfigId: string) => {
  try {
    const response = await authFetch('/api/v1/agent/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ llm_config_id: llmConfigId }),
    })
    const data = await response.json()
    const newSession = data.session
    
    setSessions([newSession, ...sessions])
    setCurrentSession(newSession)
    setShowNewSessionDialog(false)
    
    showToastMessage('会话创建成功', 'success')
  } catch (error) {
    showToastMessage('创建会话失败', 'error')
  }
}
```

#### 4. 发送消息使用会话的模型

```typescript
// 旧代码 ❌
body: JSON.stringify({
  message: userMessage,
  llm_config_id: selectedLlm || undefined,  // 从UI状态读取
})

// 新代码 ✅
body: JSON.stringify({
  message: userMessage,
  llm_config_id: currentSession.llm_config_id,  // 从会话读取
})
```

#### 5. UI 改动

**删除：会话中的 LLM 切换下拉框**
```tsx
{/* 旧代码 - 删除 ❌ */}
<div className="relative" ref={llmDropdownRef}>
  <button onClick={() => setShowLlmDropdown(!showLlmDropdown)}>
    {/* 下拉框内容 */}
  </button>
  {showLlmDropdown && (
    <div>{ /* 下拉选项 */}</div>
  )}
</div>
```

**添加：只读的模型显示**
```tsx
{/* 新代码 - 添加 ✅ */}
{currentSession && currentSession.llm_config_id && (
  <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300">
    <Bot className="w-4 h-4" />
    <span>
      {llmConfigs.find(c => c.id === currentSession.llm_config_id)?.model || '未知模型'}
    </span>
  </div>
)}
```

**添加：新建会话对话框**
```tsx
{showNewSessionDialog && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div ref={newSessionDialogRef} className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
      <h3>选择模型</h3>
      <p>会话创建后将使用选定的模型，无法更改</p>
      
      {/* 模型选择列表 */}
      <div className="space-y-2 mb-6">
        {llmConfigs.filter(c => c.is_active).map(config => (
          <button
            onClick={() => setSelectedLlmForNewSession(config.id)}
            className={/* 选中样式 */}
          >
            <div>{config.model}</div>
            <div>{config.provider}</div>
          </button>
        ))}
      </div>
      
      {/* 按钮 */}
      <div className="flex gap-3">
        <button onClick={() => setShowNewSessionDialog(false)}>取消</button>
        <button onClick={() => createSession(selectedLlmForNewSession)}>创建会话</button>
      </div>
    </div>
  </div>
)}
```

## 对比表

| 方面 | 旧设计 | 新设计 |
|------|--------|--------|
| **模型选择时机** | 会话中随时 | 新建会话时 |
| **是否可更改** | 看起来可以（但不起作用） | 明确不可更改 |
| **只有一个模型** | 仍显示下拉框 | 自动使用，不显示选择 |
| **多个模型** | 在会话中切换 | 新建时选择 |
| **UI 清晰度** | 混淆 | 清晰明确 |
| **用户理解** | 不确定能否切换 | 明确知道绑定关系 |

## 用户体验改进

### 1. 更清晰的心智模型

**旧：**
- ❓ 这个下拉框是什么？
- ❓ 我能随时切换模型吗？
- ❓ 切换会影响之前的对话吗？

**新：**
- ✅ 新建会话时选择模型
- ✅ 会话绑定一个模型，不能更改
- ✅ 每个会话独立使用各自的模型

### 2. 简化的交互

**只有一个模型：**
```
点击"新建会话" → 立即创建（自动）
```

**多个模型：**
```
点击"新建会话" → 选择对话框 → 选择模型 → 创建
```

### 3. 更好的视觉反馈

**会话列表：**
- 可以显示每个会话使用的模型

**会话头部：**
- 显示当前会话使用的模型（只读，不可点击）
- 清楚表明这是"信息显示"而非"选择控件"

## 数据流

### 创建会话

```
前端
    ↓
POST /api/v1/agent/sessions
Body: { "llm_config_id": "xxx" }
    ↓
后端 (agent/handlers.go)
    ↓
AgentManager.CreateSession(llmConfigID)
    ↓
保存到数据库 (models.AgentSession)
    ↓
返回会话（包含 llm_config_id）
    ↓
前端更新状态
```

### 发送消息

```
前端
    ↓
从 currentSession.llm_config_id 读取
    ↓
POST /api/v1/agent/sessions/:id/messages
Body: { "message": "...", "llm_config_id": "xxx" }
    ↓
后端使用指定的 LLM 配置处理
    ↓
返回流式响应
```

## 数据库变更

### AgentSession 表

**新增字段：**
```
llm_config_id VARCHAR(255)  // 会话绑定的 LLM 配置 ID
```

**数据迁移：**
- 旧会话的 `llm_config_id` 为空字符串
- 发送消息时如果会话没有 `llm_config_id`，使用当前默认配置
- 向后兼容

## 优势总结

| 优势 | 说明 |
|------|------|
| **概念清晰** | 明确"一个会话一个模型"的设计 |
| **交互简化** | 只有一个模型时无需选择 |
| **减少困惑** | 不再暗示可以切换模型 |
| **更好的 UX** | 在正确的时机（新建时）做选择 |
| **数据一致性** | 会话的所有对话使用同一模型 |
| **易于理解** | 用户清楚知道每个会话用什么模型 |

## UI 截图说明

### 新建会话按钮
- 位置：页面右上角
- 状态：如果没有激活的模型则禁用

### 模型选择对话框（多个模型时）
- 标题："选择模型"
- 提示："会话创建后将使用选定的模型，无法更改"
- 列表：所有激活的 LLM 配置
- 按钮："取消" 和 "创建会话"

### 会话中的模型显示（只读）
- 位置：页面右上角（新建会话按钮左侧）
- 样式：灰色背景，带机器人图标
- 内容：模型名称（如 "Claude Sonnet 4"）
- 交互：无（纯展示）

## 测试场景

### 测试 1: 只有一个模型
1. 配置一个 LLM
2. 点击"新建会话"
3. ✅ 应该立即创建会话，不显示选择对话框

### 测试 2: 多个模型
1. 配置多个 LLM
2. 点击"新建会话"
3. ✅ 应该显示模型选择对话框
4. 选择一个模型，点击"创建会话"
5. ✅ 会话创建，显示所选模型

### 测试 3: 模型绑定持久化
1. 创建会话并选择模型 A
2. 发送几条消息
3. 刷新页面
4. ✅ 会话仍显示模型 A
5. 继续发送消息
6. ✅ 仍使用模型 A

### 测试 4: 多会话不同模型
1. 创建会话 1，选择模型 A
2. 创建会话 2，选择模型 B
3. 切换到会话 1
4. ✅ 显示模型 A
5. 切换到会话 2
6. ✅ 显示模型 B

### 测试 5: 没有模型
1. 删除所有 LLM 配置
2. ✅ "新建会话"按钮禁用
3. 点击会提示去配置 LLM

## 向后兼容

### 旧会话的处理

**情况 1: 旧会话没有 llm_config_id**
```go
// 在发送消息时
if session.LLMConfigID == "" {
    // 使用当前的默认 LLM 配置
    llmConfigID = getCurrentDefaultLLMConfigID()
}
```

**情况 2: 旧会话的 llm_config_id 指向已删除的配置**
```go
// 检查配置是否存在
config, err := db.GetLLMConfig(session.LLMConfigID)
if err != nil {
    // 配置不存在，使用默认配置
    llmConfigID = getCurrentDefaultLLMConfigID()
}
```

## 相关文档

- [Agent Chat 设计文档](./AGENT_CHAT_DESIGN.md)
- [LLM 配置管理](./LLM_CONFIG.md)
- [会话管理](./SESSION_MANAGEMENT.md)

## 总结

通过这个改进，我们实现了：

✅ **清晰的概念**：一个会话绑定一个模型  
✅ **友好的交互**：智能显示，减少不必要的选择  
✅ **明确的提示**：用户知道选择的影响  
✅ **简化的 UI**：移除了混淆的切换控件  
✅ **更好的 UX**：在正确的时机做正确的事  

这个改进让 Agent Chat 的模型选择逻辑更加清晰、直观、易用！🎯

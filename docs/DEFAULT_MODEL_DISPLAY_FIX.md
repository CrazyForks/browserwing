# 默认模型显示修复 - 显示实际模型名

## 用户反馈

> "现在重启服务后，查看一些最近的历史会话，会显示为默认模型，没有显示模型名。实际上是选择了确实是默认模型，但是应该也要显示出实际模型名才对。"

## 问题描述

### 当前行为

当查看历史会话时，如果该会话使用的是默认模型（`llm_config_id` 为空）：

```
会话列表：
  📝 获取B站内容
     2026-01-25  默认模型  ← 只显示"默认模型"，不知道具体是什么模型

当前会话显示：
  🤖 默认模型  ← 同样只显示"默认模型"
```

**问题：** 用户无法知道"默认模型"具体是哪个模型（如 deepseek-v3、gpt-4 等）

### 期望行为

应该显示实际的默认模型名称：

```
会话列表：
  📝 获取B站内容
     2026-01-25  deepseek-v3 (默认)  ← ✅ 显示实际模型名 + 标注"默认"

当前会话显示：
  🤖 deepseek-ai/DeepSeek-V3 (默认)  ← ✅ 显示实际模型 ID + 标注"默认"
```

## 根本原因

### 代码分析

**会话列表显示代码（旧版）：**

```tsx
<span className="text-xs">
  {session.llm_config_id
    ? llmConfigs.find((c) => c.id === session.llm_config_id)?.name 
      || session.llm_config_id
    : t('agentChat.defaultModel') || '默认模型'}  // ❌ 只显示文本
</span>
```

**当前会话显示代码（旧版）：**

```tsx
<span>
  {currentSession.llm_config_id 
    ? (llmConfigs.find(c => c.id === currentSession.llm_config_id)?.model 
       || ...)
    : t('agentChat.defaultModel') || '默认模型'}  // ❌ 只显示文本
</span>
```

**问题：** 
- 当 `llm_config_id` 为空时，直接显示翻译文本"默认模型"
- 没有查找实际的默认模型配置

## 解决方案

### 实现逻辑

**默认模型定义：** 第一个 `is_active: true` 的 LLM 配置

**修复策略：**
1. 当 `llm_config_id` 为空时，查找第一个激活的模型
2. 如果找到，显示模型名 + "(默认)" 标注
3. 如果没有找到（异常情况），回退到显示"默认模型"

### 代码实现

#### 1. 会话列表显示

```tsx
{sessions.map((session: ChatSession) => {
  // 获取模型显示名称
  const getModelDisplayName = () => {
    if (session.llm_config_id) {
      // 有指定模型
      const config = llmConfigs.find((c) => c.id === session.llm_config_id);
      return config?.name || session.llm_config_id;
    } else {
      // ✨ 使用默认模型（第一个激活的模型）
      const defaultModel = llmConfigs.find((c) => c.is_active);
      if (defaultModel) {
        return `${defaultModel.name} (${t('agentChat.defaultModel') || '默认'})`;
      }
      return t('agentChat.defaultModel') || '默认模型';
    }
  };
  
  return (
    <button key={session.id} ...>
      <div className="font-medium truncate">
        {session.messages[0]?.content || t('agentChat.newChat')}
      </div>
      <div className="text-xs ...">
        <span>{formatDate(session.created_at)}</span>
        <span className="text-xs">
          {getModelDisplayName()}  {/* ✅ 使用函数获取 */}
        </span>
      </div>
    </button>
  );
})}
```

#### 2. 当前会话模型显示

```tsx
{currentSession && (
  <div className="flex items-center gap-2 ...">
    <Bot className="w-4 h-4" />
    <span>
      {currentSession.llm_config_id 
        ? (llmConfigs.find(c => c.id === currentSession.llm_config_id)?.model 
           || ...)
        : (() => {
            // ✨ 使用默认模型（第一个激活的模型）
            const defaultModel = llmConfigs.find(c => c.is_active);
            return defaultModel 
              ? `${defaultModel.model} (${t('agentChat.defaultModel') || '默认'})`
              : t('agentChat.defaultModel') || '默认模型';
          })()}
    </span>
  </div>
)}
```

## 效果对比

### 会话列表

**旧版本 ❌：**
```
📝 获取B站首页内容
   2026-01-25  默认模型

📝 搜索今天的新闻
   2026-01-25  Claude 3.5

📝 你是什么模型
   2026-01-25  默认模型
```
**问题：** 不知道"默认模型"具体是什么

**新版本 ✅：**
```
📝 获取B站首页内容
   2026-01-25  deepseek-v3 (默认)  ← 清晰

📝 搜索今天的新闻
   2026-01-25  Claude 3.5

📝 你是什么模型
   2026-01-25  deepseek-v3 (默认)  ← 清晰
```
**改善：** 一目了然地知道使用的是哪个模型

### 当前会话显示

**旧版本 ❌：**
```
🤖 默认模型
```

**新版本 ✅：**
```
🤖 deepseek-ai/DeepSeek-V3 (默认)
```

## 技术细节

### 默认模型查找逻辑

```tsx
const defaultModel = llmConfigs.find((c) => c.is_active);
```

**说明：**
- `llmConfigs` 是从后端 `/api/v1/llm-configs` 获取的配置列表
- `is_active: true` 表示该模型是激活的
- `find()` 返回第一个匹配的配置（即默认模型）

### 显示格式

| 位置 | 有指定模型 | 使用默认模型 | 无可用模型 |
|------|-----------|-------------|-----------|
| 会话列表 | 显示 `config.name` | 显示 `name (默认)` | 显示"默认模型" |
| 当前会话 | 显示 `config.model` | 显示 `model (默认)` | 显示"默认模型" |

**示例：**

```
会话列表：
  - deepseek-v3 (默认)     ← 配置名称
  - Claude 3.5             ← 配置名称

当前会话显示：
  - deepseek-ai/DeepSeek-V3 (默认)  ← 模型 ID
  - anthropic/claude-3-5-sonnet     ← 模型 ID
```

## 边缘情况处理

### 情况 1: 没有激活的模型

```tsx
const defaultModel = llmConfigs.find((c) => c.is_active);
if (defaultModel) {
  return `${defaultModel.name} (默认)`;
}
// ✅ 回退：显示"默认模型"
return t('agentChat.defaultModel') || '默认模型';
```

**场景：** 用户禁用了所有模型（异常情况）
**处理：** 显示"默认模型"作为回退

### 情况 2: llmConfigs 尚未加载

```tsx
// llmConfigs 在组件挂载时通过 useEffect 加载
useEffect(() => {
  loadLLMConfigs()  // 加载 LLM 配置
  loadSessions()    // 加载会话列表
}, [])
```

**场景：** 组件初始化时，`llmConfigs` 可能为空数组
**处理：** `find()` 返回 `undefined`，回退到显示"默认模型"

### 情况 3: 历史会话引用的模型已删除

```tsx
if (session.llm_config_id) {
  const config = llmConfigs.find((c) => c.id === session.llm_config_id);
  return config?.name || session.llm_config_id;  // ✅ 显示 ID
}
```

**场景：** 会话创建时使用的模型后来被删除
**处理：** 显示模型 ID 作为回退

## 国际化支持

### 翻译文本

```tsx
t('agentChat.defaultModel')  // "默认模型" 或 "Default"
```

**中文显示：**
```
deepseek-v3 (默认)
deepseek-ai/DeepSeek-V3 (默认)
```

**英文显示（假设）：**
```
deepseek-v3 (Default)
deepseek-ai/DeepSeek-V3 (Default)
```

## 用户体验改善

### Before ❌

```
用户看到：
  📝 最近的会话
     默认模型

用户疑问：
  • "默认模型是哪个？"
  • "我用的是 GPT-4 还是 Claude？"
  • "需要点进去才能看到吗？" 😕
```

### After ✅

```
用户看到：
  📝 最近的会话
     deepseek-v3 (默认)

用户清楚：
  • 一眼就知道是 deepseek-v3
  • 知道这是默认模型
  • 无需额外点击 😊
```

## 测试验证

### 测试步骤

1. **创建使用默认模型的会话**
   ```
   - 不选择任何模型（使用默认）
   - 发送消息："你是什么模型"
   ```

2. **刷新页面**
   ```
   - F5 刷新页面
   - 观察会话列表
   ```

3. **检查显示**
   ```
   预期：
   ✅ 会话列表显示：deepseek-v3 (默认)
   ✅ 当前会话显示：deepseek-ai/DeepSeek-V3 (默认)
   
   不应该：
   ❌ 只显示"默认模型"
   ```

### 测试场景

| 场景 | llm_config_id | 预期显示（会话列表） | 预期显示（当前会话） |
|------|--------------|-------------------|-------------------|
| 使用默认模型 | `""` (空) | `deepseek-v3 (默认)` | `deepseek-ai/DeepSeek-V3 (默认)` |
| 指定模型 | `llm-123` | `Claude 3.5` | `anthropic/claude-3-5-sonnet` |
| 模型已删除 | `llm-deleted` | `llm-deleted` | `llm-deleted` |
| 无可用模型 | `""` (空) | `默认模型` | `默认模型` |

## 代码变更

```diff
// frontend/src/pages/AgentChat.tsx

 {sessions.map((session: ChatSession) => {
+  // 获取模型显示名称
+  const getModelDisplayName = () => {
+    if (session.llm_config_id) {
+      const config = llmConfigs.find((c) => c.id === session.llm_config_id);
+      return config?.name || session.llm_config_id;
+    } else {
+      // ✨ 使用默认模型（第一个激活的模型）
+      const defaultModel = llmConfigs.find((c) => c.is_active);
+      if (defaultModel) {
+        return `${defaultModel.name} (${t('agentChat.defaultModel') || '默认'})`;
+      }
+      return t('agentChat.defaultModel') || '默认模型';
+    }
+  };
+  
   return (
     <button key={session.id} ...>
       ...
       <span className="text-xs">
-        {session.llm_config_id
-          ? llmConfigs.find((c) => c.id === session.llm_config_id)?.name 
-            || session.llm_config_id
-          : t('agentChat.defaultModel') || '默认模型'}
+        {getModelDisplayName()}
       </span>
     </button>
   );
 })}

 {currentSession && (
   <div className="flex items-center gap-2 ...">
     <Bot className="w-4 h-4" />
     <span>
       {currentSession.llm_config_id 
         ? (llmConfigs.find(c => c.id === currentSession.llm_config_id)?.model || ...)
-        : t('agentChat.defaultModel') || '默认模型'}
+        : (() => {
+            const defaultModel = llmConfigs.find(c => c.is_active);
+            return defaultModel 
+              ? `${defaultModel.model} (${t('agentChat.defaultModel') || '默认'})`
+              : t('agentChat.defaultModel') || '默认模型';
+          })()}
     </span>
   </div>
 )}
```

**总计：** +20 行（新增查找默认模型逻辑）

## 相关改进

这是改进 #3 的**补充修复**：

| 改进 | 说明 |
|------|------|
| 改进 #3 | 历史会话显示模型信息（基础） |
| **改进 #3.1** | **默认模型显示实际名称（本文档）** |

## 总结

### 问题
历史会话使用默认模型时，只显示"默认模型"，不知道具体是哪个模型。

### 原因
代码直接显示翻译文本，没有查找实际的默认模型配置。

### 解决方案
查找第一个 `is_active` 的模型配置，显示实际模型名 + "(默认)" 标注。

### 效果
- ✅ 会话列表：`deepseek-v3 (默认)`
- ✅ 当前会话：`deepseek-ai/DeepSeek-V3 (默认)`
- ✅ 一目了然，无需额外点击
- ✅ 代码简洁，逻辑清晰

**一句话总结：** 让"默认模型"显示实际的模型名称，用户体验更清晰！✨

# Greeting 重复问题 - 快速参考

## 问题

**用户看到重复的 greeting：**

```
收到，我将帮您获取B站首页的推送内容。 ← 评估阶段
好的，我来帮你获取B站首页的最新推送内容。 ← Agent 执行阶段
```

**感觉啰嗦，不自然 😐**

## 原因

```
┌─────────────────────────────────────────────┐
│ 改进 #8: 工具任务返回 Greeting（新增）     │
│   ↓                                         │
│ 评估阶段返回 greeting_msg                  │
│   "收到，我将帮您..."                       │
│                                             │
│ +                                           │
│                                             │
│ Agent 原有行为：生成说明文本                │
│   "好的，我来帮你..."                       │
│                                             │
│ =                                           │
│                                             │
│ ❌ 两条 greeting，重复显示                  │
└─────────────────────────────────────────────┘
```

## 解决方案

**修改 Agent System Prompt（+6 行）：**

```go
// backend/agent/agent.go

func (am *AgentManager) GetSystemPrompt() string {
    return `...

CRITICAL - Communication Style:
- The user may have already received a greeting/acknowledgment message
- DO NOT repeat greetings or acknowledgments in your responses
- Proceed DIRECTLY to executing tools and providing results
- Be concise: focus on actions and outcomes, not explanations
- Example: Instead of "好的，我来帮你..." just call the tool directly
    `
}
```

## 效果

**用户现在只看到一条 greeting：**

```
收到，我将帮您获取B站首页的推送内容。 ✅
[工具执行中...]
[结果]
```

**更简洁、更自然、更流畅！** 😊

## 为什么有效？

```
┌──────────────────────────────────────────┐
│ System Prompt 是 Agent 的行为指南        │
│                                          │
│ 每次执行时，Agent 都会读取 System Prompt│
│   ↓                                      │
│ 看到指令："不要重复 greeting"            │
│   ↓                                      │
│ 遵守指令，直接执行工具 ✅                │
│   ↓                                      │
│ 结果：无重复，流程顺畅                   │
└──────────────────────────────────────────┘
```

## 测试

**重启服务器后，测试：**

```
用户："获取B站首页的推送内容"
```

**预期界面：**
```
✅ 收到，我将帮您获取B站首页的推送内容。
   工具调用：fetch_bilibili_homepage_content (loading)
   [结果显示...]
```

**不应该出现：**
```
❌ "好的，我来帮你..."
❌ "让我帮您..."
❌ 任何重复的确认语句
```

## 相关文档

- [GREETING_FOR_TOOL_TASKS.md](./GREETING_FOR_TOOL_TASKS.md) - 基础功能（改进 #8）
- [NATURAL_GREETING_FIX.md](./NATURAL_GREETING_FIX.md) - 详细说明（改进 #9）
- [TODAY_FINAL_SUMMARY.md](./TODAY_FINAL_SUMMARY.md) - 今日总结

## 总结

| 维度 | 效果 |
|------|------|
| **代码** | +6 行 |
| **范围** | 全局生效 |
| **性能** | 无影响 |
| **体验** | 更自然 ✅ |

**一句话：** 通过 System Prompt 让 Agent 知道不要重复 greeting，简单高效！🎯

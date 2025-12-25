# 语义录制增强文档

## 概述

本次更新为 BrowserWing 的录制功能添加了丰富的语义信息采集能力,以支持未来的自愈功能。当网页改版导致原有选择器失效时,这些语义信息可以帮助系统重新定位元素。

## 新增字段

在 `ScriptAction` 结构中新增了以下字段:

### 1. Intent (操作意图)
```go
type ActionIntent struct {
    Verb   string `json:"verb,omitempty"`   // 操作动词: click, input, select, submit
    Object string `json:"object,omitempty"` // 操作对象: login button, email input
}
```

**采集逻辑:**
- `verb`: 根据事件类型推断 (click → click, input → input, change → select/check/choose)
- `object`: 优先使用 aria-label, label 文本, innerText, placeholder, name, id

### 2. Accessibility (可访问性信息)
```go
type AccessibilityInfo struct {
    Role  string `json:"role,omitempty"`  // ARIA 角色: button, textbox, link
    Name  string `json:"name,omitempty"`  // 可访问名称
    Value string `json:"value,omitempty"` // 当前值
}
```

**采集逻辑:**
- `role`: 优先使用 `role` 属性,否则根据标签推断隐式角色
  - button → button
  - a → link
  - input[type=text] → textbox
  - input[type=checkbox] → checkbox
  - select → combobox
  - 等等...
- `name`: 按优先级获取
  1. aria-label
  2. aria-labelledby 引用的元素文本
  3. 关联的 label 元素
  4. 元素自身文本 (限制 50 字符)
  5. placeholder
  6. title 属性
  7. alt 属性
- `value`: 元素的当前值

### 3. Context (上下文信息)
```go
type ActionContext struct {
    NearbyText   []string `json:"nearby_text,omitempty"`   // 附近可见文本
    AncestorTags []string `json:"ancestor_tags,omitempty"` // 祖先标签
    FormHint     string   `json:"form_hint,omitempty"`     // 表单类型提示
}
```

**采集逻辑:**
- `nearby_text`: 收集元素周围 100px 内的可见文本 (最多 5 个,每个限制 30 字符)
- `ancestor_tags`: 向上遍历最多 10 层祖先元素的标签名
- `form_hint`: 识别表单类型
  - login: 登录表单
  - register: 注册表单
  - search: 搜索表单
  - checkout: 结账表单
  - contact: 联系表单
  - auth: 含密码的认证表单
  - generic: 普通表单

### 4. Evidence (录制证据)
```go
type ActionEvidence struct {
    BackendDOMNodeID int64   `json:"backend_dom_node_id,omitempty"` // CDP DOM 节点 ID
    AXNodeID         string  `json:"ax_node_id,omitempty"`          // 无障碍树节点 ID
    Confidence       float64 `json:"confidence,omitempty"`          // 匹配置信度
}
```

**采集逻辑:**
- `backend_dom_node_id`: 预留,由 Go 端通过 CDP 协议获取
- `ax_node_id`: 预留,由 Go 端获取
- `confidence`: 根据选择器可靠性计算 (0.0 - 1.0)
  - 有 id: 0.95
  - 有 name 属性: 0.85
  - 有 aria-label: 0.8
  - 有关联 label: 0.75
  - 有稳定 class: 0.7
  - 动态 class: 0.4
  - 仅 nth-child: 0.3

## 实现细节

### 新增辅助函数 (recorder.js)

1. **implicitRole(el)**: 根据标签推断隐式 ARIA 角色
2. **getRole(el)**: 获取元素的 ARIA 角色 (显式或隐式)
3. **getLabelText(el)**: 获取关联 label 元素的文本
4. **getAccessibleName(el)**: 获取元素的可访问名称
5. **inferVerb(eventType, el)**: 推断操作动词
6. **inferObject(el)**: 推断操作对象
7. **getNearbyText(el, maxDistance)**: 获取附近可见文本
8. **getAncestorTags(el)**: 获取祖先标签列表
9. **getFormHint(el)**: 判断表单类型
10. **calculateConfidence(el, selectors)**: 计算选择器置信度
11. **enrichActionWithSemantics(action, element, eventType)**: 为操作添加语义信息

### recordAction 函数修改

```javascript
var recordAction = function(action, element, eventType) {
    // ... 去重逻辑 ...
    
    // 添加语义信息（自愈所需）
    if (element && eventType) {
        action = enrichActionWithSemantics(action, element, eventType);
    }
    
    // 添加新操作
    window.__recordedActions__.push(action);
    // ...
};
```

### 所有事件监听器已更新

✅ click 事件
✅ input 事件 (防抖)
✅ blur 事件
✅ change 事件 (select, checkbox, radio, file upload)
✅ DOMCharacterDataModified 事件 (富文本编辑器)
✅ keydown 事件 (Ctrl+C, Ctrl+V, Enter)
✅ scroll 事件
✅ AI 提取操作
✅ AI 表单填充操作
✅ 数据抓取操作

所有事件监听器现在都会传递 `element` 和 `eventType` 参数给 `recordAction`,确保语义信息能被正确采集。

## 使用示例

录制一个点击按钮的操作时,会生成如下数据:

```json
{
  "type": "click",
  "selector": "#login-button",
  "xpath": "//button[@id='login-button']",
  "timestamp": 1703512345678,
  "intent": {
    "verb": "click",
    "object": "Sign In"
  },
  "accessibility": {
    "role": "button",
    "name": "Sign In",
    "value": ""
  },
  "context": {
    "nearby_text": ["Welcome back!", "Email", "Password"],
    "ancestor_tags": ["form", "div", "body"],
    "form_hint": "login"
  },
  "evidence": {
    "backend_dom_node_id": 0,
    "ax_node_id": "",
    "confidence": 0.95
  }
}
```

## 下一步计划

1. **自愈算法实现**: 利用这些语义信息,在选择器失效时通过多维度匹配重新定位元素
2. **CDP 集成**: 在 Go 端通过 CDP 协议填充 `backend_dom_node_id` 和 `ax_node_id`
3. **机器学习**: 使用历史数据训练模型,提高自愈的准确率
4. **评分系统**: 建立元素匹配的评分机制,选择最佳匹配

## 兼容性

- ✅ 向后兼容:旧脚本仍可正常播放
- ✅ 字段可选:所有新字段都是 `omitempty`,不影响 JSON 序列化
- ✅ 渐进增强:即使部分语义信息采集失败,录制仍能继续

## 测试建议

1. 录制一个包含各种操作的脚本 (点击、输入、选择、上传等)
2. 检查生成的 JSON 文件,确认语义字段已正确填充
3. 模拟网页改版 (修改 class、id),测试自愈能力 (待实现)

---

**版本**: v2.0  
**更新日期**: 2024-12-25  
**作者**: GitHub Copilot

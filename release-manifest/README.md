# Release Manifest

## 概述

`stable.json` 文件用于向前端应用提供最新稳定版本的信息，前端会定期检查此文件以判断是否需要提醒用户更新。

## 文件结构

```json
{
  "version": "1.0.0",           // 当前稳定版本号
  "releaseDate": "2026-01-25",  // 发布日期 (YYYY-MM-DD)
  "features": [                 // 主要特性列表（最多 8-10 条）
    "Feature 1",
    "Feature 2"
  ],
  "downloadUrl": "..."          // 下载地址（通常指向 GitHub Releases）
}
```

## 更新流程

### 何时更新

在以下情况需要更新 `stable.json`：

1. **正式版本发布**：发布新的稳定版本时（如 1.0.0, 1.1.0, 2.0.0）
2. **重要修复**：发布包含关键 Bug 修复的版本时（如 1.0.1）
3. **不需要更新**：
   - 开发版本（dev, alpha, beta）
   - 预览版本（rc1, rc2）
   - 内部测试版本

### 更新步骤

1. **更新版本号**
   ```json
   "version": "1.0.0"
   ```

2. **更新发布日期**
   ```json
   "releaseDate": "2026-01-25"
   ```

3. **更新特性列表**
   - 列出 3-8 个核心特性
   - 使用简洁的英文描述
   - 突出显示重要改进和新功能
   - 如果是修复版本，可以列出主要修复项

4. **验证 JSON 格式**
   ```bash
   cat stable.json | python3 -m json.tool
   ```

5. **提交到仓库**
   ```bash
   git add release-manifest/stable.json
   git commit -m "chore: update stable version to 1.0.0"
   git push origin main
   ```

## 前端使用方式

### 获取最新版本信息

```typescript
// 前端代码示例
const MANIFEST_URL = 'https://raw.githubusercontent.com/browserwing/browserwing/main/release-manifest/stable.json';

async function checkForUpdates(currentVersion: string) {
  try {
    const response = await fetch(MANIFEST_URL);
    const manifest = await response.json();
    
    if (manifest.version !== currentVersion) {
      // 显示更新提醒
      showUpdateNotification({
        version: manifest.version,
        releaseDate: manifest.releaseDate,
        features: manifest.features,
        downloadUrl: manifest.downloadUrl
      });
    }
  } catch (error) {
    console.error('Failed to check for updates:', error);
  }
}
```

### 版本比较

```typescript
function compareVersions(current: string, latest: string): boolean {
  const c = current.split('.').map(Number);
  const l = latest.split('.').map(Number);
  
  for (let i = 0; i < 3; i++) {
    if (l[i] > c[i]) return true;
    if (l[i] < c[i]) return false;
  }
  return false;
}

// 使用
const shouldUpdate = compareVersions('0.9.0', manifest.version);
```

### 更新通知 UI

```typescript
interface UpdateNotification {
  version: string;
  releaseDate: string;
  features: string[];
  downloadUrl: string;
}

function showUpdateNotification(update: UpdateNotification) {
  // 显示更新提醒对话框
  const message = `
    🎉 New version available: ${update.version}
    
    📅 Released: ${update.releaseDate}
    
    ✨ What's new:
    ${update.features.map(f => `  • ${f}`).join('\n')}
    
    🔗 Download: ${update.downloadUrl}
  `;
  
  // 显示通知...
}
```

## 示例版本

### 1.0.0 (首个正式版本)

```json
{
  "version": "1.0.0",
  "releaseDate": "2026-01-25",
  "features": [
    "Built-in AI Agent with multi-LLM support",
    "Universal AI tool integration (MCP + Skills + HTTP API)",
    "Visual script recording and playback",
    "LLM-driven intelligent data extraction",
    "Complete session management",
    "RefID system for stable element location",
    "High-performance architecture (89% faster)",
    "26+ HTTP API endpoints"
  ],
  "downloadUrl": "https://github.com/browserwing/browserwing/releases/latest"
}
```

### 1.0.1 (修复版本)

```json
{
  "version": "1.0.1",
  "releaseDate": "2026-01-26",
  "features": [
    "Fixed critical bug in session management",
    "Improved Chrome stability on macOS",
    "Enhanced error recovery mechanism"
  ],
  "downloadUrl": "https://github.com/browserwing/browserwing/releases/latest"
}
```

### 1.1.0 (功能更新)

```json
{
  "version": "1.1.0",
  "releaseDate": "2026-02-15",
  "features": [
    "New plugin system for custom extensions",
    "Webhook notifications support",
    "Code generation from recorded scripts",
    "Scheduling system for automated tasks",
    "Performance improvements (20% faster)"
  ],
  "downloadUrl": "https://github.com/browserwing/browserwing/releases/latest"
}
```

## 注意事项

### 版本号格式

使用语义化版本号 (Semantic Versioning)：

- **Major.Minor.Patch** (如 1.0.0)
- **Major**: 不兼容的 API 更改
- **Minor**: 向后兼容的功能新增
- **Patch**: 向后兼容的 Bug 修复

### 特性描述原则

1. **简洁明了**：每条特性不超过一行
2. **突出价值**：强调用户收益，而非技术细节
3. **优先级排序**：最重要的特性放在前面
4. **数量控制**：
   - 正式版本：5-8 条核心特性
   - 修复版本：2-4 条主要修复
   - 功能更新：3-6 条新功能

### CDN 与缓存

如果使用 CDN，注意：

1. **设置合理的缓存时间**：建议 5-10 分钟
2. **使用版本号查询参数**：如 `stable.json?v=timestamp`
3. **提供刷新机制**：允许用户手动检查更新

### 安全性

1. **使用 HTTPS**：确保传输安全
2. **验证数据**：前端应验证 JSON 结构
3. **防止注入**：不要直接执行来自 manifest 的代码

## 更新历史

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0.0 | 2026-01-25 | 首个正式版本发布 |
| 0.0.1 | 2025-12-16 | 初始版本 |

## 相关文档

- [RELEASE_NOTES_v1.0.0.md](../docs/RELEASE_NOTES_v1.0.0.md) - 详细发布说明
- [RELEASE_CHECKLIST_v1.0.0.md](../docs/RELEASE_CHECKLIST_v1.0.0.md) - 发布检查清单
- [Semantic Versioning](https://semver.org/) - 语义化版本规范

## 问题反馈

如有问题或建议，请通过以下方式反馈：

- GitHub Issues: https://github.com/browserwing/browserwing/issues
- Discord: https://discord.gg/BkqcApRj
- Twitter: @chg80333

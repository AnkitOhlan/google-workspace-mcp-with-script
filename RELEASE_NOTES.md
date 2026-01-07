# Google Docs MCP for Claude Code CLI

> 专为 Claude Code CLI 优化的 Google Workspace MCP 服务器，**唯一支持 Apps Script API**

---

## 项目概述

### 基础版本
- **来源**: [a-bonus/google-docs-mcp](https://github.com/a-bonus/google-docs-mcp)
- **原定位**: Claude Desktop
- **协议**: MIT License

### 本版本增强
- **目标平台**: Claude Code CLI (同时兼容 Claude Desktop)
- **新增功能**: Google Apps Script API 完整支持
- **兼容性修复**: Node.js v25+ 支持

---

## 功能清单

### 原有功能 (继承自 a-bonus 版本)

| 模块 | 功能 | 工具名称 |
|------|------|----------|
| **Google Docs** | 读取文档 | `readGoogleDoc` |
| | 追加内容 | `appendToGoogleDoc` |
| | 插入文本 | `insertText` |
| | 删除范围 | `deleteRange` |
| | 文本样式 | `applyTextStyle` |
| | 段落样式 | `applyParagraphStyle` |
| | 插入表格 | `insertTable` |
| | 编辑单元格 | `editTableCell` |
| | 插入图片 | `insertImageFromUrl`, `insertLocalImage` |
| | 评论管理 | `listComments`, `addComment`, `replyToComment` |
| **Google Sheets** | 读取数据 | `readSpreadsheet` |
| | 写入数据 | `writeSpreadsheet` |
| | 追加行 | `appendSpreadsheetRows` |
| | 清除范围 | `clearSpreadsheetRange` |
| | 获取信息 | `getSpreadsheetInfo` |
| | 添加工作表 | `addSpreadsheetSheet` |
| | 创建表格 | `createSpreadsheet` |
| | 筛选器 | `setBasicFilter`, `clearBasicFilter` |
| | 单元格格式 | `formatSpreadsheetCells` |
| **Google Drive** | 列出文档 | `listGoogleDocs`, `listGoogleSheets` |
| | 搜索文档 | `searchGoogleDocs` |
| | 文件管理 | `createFolder`, `moveFile`, `copyFile`, `renameFile`, `deleteFile` |
| | 模板创建 | `createFromTemplate` |

### 新增功能 (本版本)

| 模块 | 功能 | 工具名称 | 说明 |
|------|------|----------|------|
| **Apps Script** | 创建绑定脚本 | `createBoundScript` | 创建绑定到 Docs/Sheets 的脚本项目 |
| | 更新脚本内容 | `updateScriptContent` | 支持多文件上传 (Code.gs + appsscript.json) |
| | 读取脚本内容 | `getScriptContent` | 获取现有脚本的所有文件 |
| | 列出脚本项目 | `getScriptProjects` | 列出用户的 Apps Script 项目 |

---

## 代码修改记录

### 1. auth.ts - 添加 Apps Script OAuth Scope

```typescript
// 文件: src/auth.ts
// 位置: 第 21-27 行

const SCOPES = [
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/script.projects',      // 新增
  'https://www.googleapis.com/auth/script.deployments',   // 新增
];
```

### 2. server.ts - 添加 Script API Client

```typescript
// 文件: src/server.ts

// 第 4 行 - 添加 script_v1 导入
import { google, docs_v1, drive_v3, sheets_v4, script_v1 } from 'googleapis';

// 第 29 行 - 添加 googleScript 变量
let googleScript: script_v1.Script | null = null;

// 第 42 行 - 初始化 googleScript
googleScript = google.script({ version: 'v1', auth: authClient });

// 第 120-127 行 - 添加 getScriptClient helper
async function getScriptClient() {
  const { googleScript: script } = await initializeGoogleClient();
  if (!script) {
    throw new UserError("Google Apps Script client is not initialized.");
  }
  return script;
}

// 第 2638-2772 行 - 添加 4 个 Apps Script 工具
// - createBoundScript
// - updateScriptContent
// - getScriptContent
// - getScriptProjects
```

---

## 安装配置

### 前置要求

1. **Node.js v18+** (推荐 v20 LTS，v25 已测试兼容)
2. **Google Cloud Project** 并启用以下 API:
   - Google Docs API
   - Google Drive API
   - Google Sheets API
   - **Google Apps Script API** (新增)
3. **OAuth 2.0 客户端凭据** (Desktop 类型)

### Claude Code CLI 安装

```bash
# 方式 1: 使用 claude mcp add 命令
claude mcp add google-docs --scope user -- node /path/to/dist/server.js

# 方式 2: 直接编辑配置文件 (~/.claude/settings.json)
{
  "mcpServers": {
    "google-docs": {
      "command": "node",
      "args": ["/path/to/dist/server.js"]
    }
  }
}
```

### Claude Desktop 安装

编辑 `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "google-docs": {
      "command": "node",
      "args": ["C:\\path\\to\\dist\\server.js"]
    }
  }
}
```

### OAuth 首次授权

1. 将 `credentials.json` (OAuth 客户端凭据) 放入项目根目录
2. 启动服务器，会输出授权 URL
3. 在浏览器中打开 URL 并授权
4. 授权后 `token.json` 自动保存

### Apps Script API 额外设置

除了在 Google Cloud Console 启用 API，还需要:

**访问 https://script.google.com/home/usersettings**

将 **Google Apps Script API** 开关设为 **ON**

---

## 使用示例

### 示例 1: 为表格创建自动着色脚本

```
用户: 为我的表格创建一个按类型列自动着色的脚本

Claude:
1. 调用 createBoundScript 创建绑定脚本
2. 调用 updateScriptContent 上传着色代码
3. 返回使用说明
```

### 示例 2: 读取并修改现有脚本

```
用户: 读取表格的现有脚本，添加一个新函数

Claude:
1. 调用 getScriptContent 读取现有代码
2. 修改代码添加新函数
3. 调用 updateScriptContent 更新
```

---

## 已知问题

### 1. formatSpreadsheetCells 中文工作表名问题

当工作表名包含中文括号时，A1 notation 解析可能失败:
```
错误: Sheet "任务（待拆分）" not found
```

**临时方案**: 使用 Sheet ID 而非名称，或重命名工作表

### 2. Node.js v25 SlowBuffer 问题

原版依赖 `buffer-equal-constant-time` 使用已废弃的 `SlowBuffer` API。

**已修复**: 执行 `npm update` 更新依赖

---

## 与其他项目对比

| 项目 | Docs | Sheets | Drive | Script | CLI 文档 | 维护 |
|------|:----:|:------:|:-----:|:------:|:--------:|:----:|
| [a-bonus/google-docs-mcp](https://github.com/a-bonus/google-docs-mcp) | ✅ | ✅ | ✅ | ❌ | ❌ | 活跃 |
| [piotr-agier/google-drive-mcp](https://github.com/piotr-agier/google-drive-mcp) | ✅ | ✅ | ✅ | ❌ | ❌ | 活跃 |
| [isaacphi/mcp-gdrive](https://github.com/isaacphi/mcp-gdrive) | ❌ | ✅ | ✅ | ❌ | ❌ | 活跃 |
| **本版本** | ✅ | ✅ | ✅ | ✅ | ✅ | 新建 |

---

## 发布建议

### 仓库命名建议

- `google-docs-mcp-plus` - 强调增强版
- `claude-code-google-workspace` - 强调目标平台
- `mcp-google-workspace-script` - 强调 Script 功能

### README 要点

1. 开头明确: "专为 Claude Code CLI 设计"
2. 突出: "唯一支持 Apps Script API"
3. 提供一键安装命令
4. 包含 GIF 演示

### 致谢

- 基于 [a-bonus/google-docs-mcp](https://github.com/a-bonus/google-docs-mcp)
- 遵循 MIT License

---

## 文件清单

```
google-docs-mcp-package/
├── src/
│   ├── auth.ts                 # OAuth 认证 (已修改)
│   ├── server.ts               # 主服务器 (已修改)
│   ├── types.ts                # 类型定义
│   ├── googleDocsApiHelpers.ts # Docs API 辅助函数
│   ├── googleSheetsApiHelpers.ts # Sheets API 辅助函数
│   └── filterHelpers.ts        # 筛选器辅助函数
├── dist/                       # 编译输出
│   └── server.js               # 编译后的服务器
├── package.json                # 依赖配置
├── package-lock.json           # 依赖锁定
├── tsconfig.json               # TypeScript 配置
├── LICENSE                     # MIT 许可证
├── README.md                   # 原版说明文档
└── RELEASE_NOTES.md            # 本文档
```

---

## 联系方式

如有问题或建议，请通过 GitHub Issues 反馈。

---

*文档生成时间: 2025-01-07*
*Claude Code CLI + Apps Script MCP 集成完成*

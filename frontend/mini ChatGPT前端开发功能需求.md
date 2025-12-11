# 前端功能需求文档 - DeepSeek-V3.2 Agent 聊天应用

## 项目概述

这是一个基于 **LangChain 1.1** 和 **DeepSeek-V3.2** 的创新 Agent 应用，为桌面 Web 端设计，提供类似 ChatGPT 的美观界面，核心特色是左侧 2/3 为聊天区域，右侧 1/3 为 MCP 工具组装台。

## 技术栈

- **框架**: React + TypeScript
- **样式**: Tailwind CSS v4.0
- **UI 组件**: 自定义组件库（基于 shadcn/ui 风格）
- **通知系统**: Sonner (toast)
- **拖拽调整**: re-resizable
- **图标**: lucide-react
- **数据持久化**: LocalStorage
- **通信协议**: SSE (Server-Sent Events)

---

## 核心功能架构

### 1. 布局结构

#### 1.1 三栏布局

```
+------------------+------------------------+------------------+
|   学习模式面板    |      主聊天区域         |   MCP工具组装台   |
|  (可选左侧面板)   |     (中央 2/3)         |  (可选右侧面板)   |
|   可拖动调整     |                        |    可拖动调整     |
+------------------+------------------------+------------------+
```

- **学习模式面板**: 左侧弹出，可拖动调整宽度，显示课程课件（HTML iframe）
- **主聊天区域**: 中央固定区域，宽度根据左右面板动态调整
- **MCP 工具组装台**: 右侧弹出，可拖动调整宽度，管理 MCP 工具

#### 1.2 响应式设计

- 主聊天区域通过 CSS `position: fixed` + 动态 `left/right` 实现
- 左右面板打开时，主区域自动压缩
- 拖动调整宽度时，实时更新主区域尺寸

---

## 详细功能模块

### 2. 聊天系统

#### 2.1 核心特性

- ✅ **流式响应**: 支持 SSE 协议，实时接收后端流式数据
- ✅ **多轮对话**: 每个 conversation 独立维护历史记录
- ✅ **消息类型**: 用户消息 + AI 响应（支持复杂结构）
- ✅ **自动滚动**: 新消息自动滚动到底部
- ✅ **欢迎屏幕**: 无对话时显示欢迎界面

#### 2.2 消息结构（新格式）

**AI 消息支持三种内容类型混合**：

1. **文本块 (TextBlock)**
   
   - 类型: `'text'`
   - 内容: Markdown 格式的文本
   - 渲染: 支持图片、代码块、列表、表格等

2. **工具调用块 (ToolCallBlock)**
   
   - 类型: `'tool_call'`
   - 包含: 工具名称、输入参数、输出结果、执行状态
   - 渲染: 卡片形式，支持展开/折叠查看详情
   - 状态: `running` | `completed`

3. **思考过程** (已废弃，现在使用文本块)
   
   - 旧版本使用 `chunks` 数组，现在统一使用 `blocks`

**消息数据结构**：

```typescript
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content?: string;  // 用户消息内容
  blocks?: (TextBlock | ToolCallBlock)[];  // AI 消息内容（新格式）
  chunks?: MessageChunk[];  // 旧格式（保留兼容性）
  timestamp: number;
  isComplete?: boolean;  // 消息是否完成
  isStreaming?: boolean;  // 是否正在流式输出
}

interface TextBlock {
  id: string;
  type: 'text';
  content: string;  // Markdown 格式
  timestamp: number;
}

interface ToolCallBlock {
  id: string;
  type: 'tool_call';
  toolName: string;
  input: any;
  output?: any;
  status: 'running' | 'completed';
  timestamp: number;
  isExpanded?: boolean;
}
```

#### 2.3 SSE 流式数据处理

**后端 SSE 事件类型**：

```typescript
interface SSEEvent {
  type: 'token' | 'tool_start' | 'tool_end' | 'finish' | 'error';
  data: any;
}
```

**事件处理逻辑**：

1. **token 事件**: 文本流式输出
   
   ```json
   {
     "type": "token",
     "data": {
       "content": "这是一段",
       "content_type": "text"  // 或 "thought" (思考过程)
     }
   }
   ```
   
   - `content_type: "text"`: 追加到当前文本块
   - `content_type: "thought"`: 暂时忽略（未来可扩展）

2. **tool_start 事件**: 工具调用开始
   
   ```json
   {
     "type": "tool_start",
     "data": {
       "tool_name": "tavily_search",
       "input": { "query": "DeepSeek" }
     }
   }
   ```
   
   - 创建新的 `ToolCallBlock`，状态为 `running`

3. **tool_end 事件**: 工具调用完成
   
   ```json
   {
     "type": "tool_end",
     "data": {
       "tool_name": "tavily_search",
       "output": { "results": [...] }
     }
   }
   ```
   
   - 更新对应工具块的状态为 `completed`，填充 output

4. **finish 事件**: 消息完成
   
   ```json
   {
     "type": "finish",
     "data": {}
   }
   ```
   
   - 标记消息为 `isComplete: true, isStreaming: false`

5. **error 事件**: 错误处理
   
   ```json
   {
     "type": "error",
     "data": {
       "message": "连接超时"
     }
   }
   ```
   
   - 显示 Toast 通知，标记消息完成

#### 2.4 Markdown 渲染

**支持的 Markdown 特性**：

- ✅ 标题 (H1-H6)
- ✅ 粗体、斜体、删除线
- ✅ 代码块（带语法高亮）
- ✅ 行内代码
- ✅ 引用块
- ✅ 有序/无序列表
- ✅ 表格
- ✅ 图片（支持 alt 文本）
- ✅ 链接
- ✅ 分隔线

**实现**: 自定义 `renderMarkdown` 工具函数（`/utils/markdown.ts`）

#### 2.5 输入框特性

- ✅ 自动高度调整（textarea 随内容增长）
- ✅ Enter 发送，Shift+Enter 换行
- ✅ 加载时禁用输入
- ✅ 发送后自动清空

---

### 3. 对话管理（左侧边栏）

#### 3.1 功能列表

- ✅ **新建对话**: 创建全新对话，重置工具状态
- ✅ **切换对话**: 点击历史对话切换上下文
- ✅ **重命名对话**: 双击对话标题编辑
- ✅ **删除对话**: 删除确认对话框（自定义 ConfirmDialog 组件）
- ✅ **对话排序**: 按更新时间倒序排列
- ✅ **对话标题**: 默认"新对话"，后续可手动修改

#### 3.2 数据结构

```typescript
interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}
```

#### 3.3 本地存储

- 使用 `localStorage` 持久化
- 自动保存对话列表、活跃对话 ID、MCP 工具配置
- 启动时自动加载历史数据
- 支持数据迁移（确保唯一 ID）

---

### 4. MCP 工具管理（右侧边栏）

#### 4.1 许愿池功能

**用户流程**：

1. 用户在文本框输入需求（自然语言）
   - 示例: "我想让 Agent 能够操作浏览器，或者读取我的 Notion 笔记"
2. 点击"智能分析并添加工具"
3. 前端调用后端 API: `POST /mcp/search_ai`
4. 后端 AI 分析需求，返回推荐工具列表
5. 弹出 `WishResultModal` 显示推荐结果
6. 用户确认后批量安装工具

**后端 API 接口**:

```typescript
// 请求
POST /mcp/search_ai
{
  "query": "我想操作浏览器"
}

// 响应
[
  {
    "name": "browser-automation",
    "description": "自动化浏览器操作",
    "recommend_reason": "可以帮助您控制浏览器访问网页",
    "installed": false,
    "type": "stdio",
    "default_config": {
      "command": "npx",
      "args": ["-y", "@browser-automation/mcp-server"],
      "env": {}
    }
  }
]
```

#### 4.2 工具列表

**功能**:

- ✅ 显示所有已安装的 MCP 工具
- ✅ 开关切换（启用/禁用工具）
- ✅ 点击工具名称打开配置弹窗
- ✅ 添加新工具按钮

**工具数据结构**:

```typescript
interface MCPTool {
  id: string;
  name: string;
  description: string;
  icon: string;  // emoji
  iconBg: string;  // Tailwind 类名
  introduction: string;  // 详细介绍
  config: MCPConfig;
  enabled: boolean;
  version?: string;
  author?: string;
  type?: 'stdio' | 'sse';
}

interface MCPConfig {
  mcpServers: {
    [key: string]: {
      command: string;
      args: string[];
      env?: Record<string, string>;
    };
  };
}
```

#### 4.3 工具配置弹窗 (ConfigModal)

**功能**:

- ✅ 查看工具详细信息
- ✅ 编辑配置 JSON（`config_json` 字段）
- ✅ 测试连接按钮
- ✅ 保存配置并同步到后端
- ✅ 删除工具（确认对话框）

**后端 API**:

```typescript
// 测试连接
POST /mcp/test_connection
{
  "name": "tavily-search",
  "description": "搜索工具",
  "type": "stdio",
  "config": { ... }
}

// 响应
{
  "success": true,
  "message": "连接成功"
}

// 保存配置
POST /mcp/install
{
  "name": "tavily-search",
  "description": "搜索工具",
  "type": "stdio",
  "config": { ... }
}
```

#### 4.4 添加工具弹窗 (AddToolModal)

**功能**:

- ✅ 手动添加新工具
- ✅ 填写工具名称、描述、类型
- ✅ 编辑配置 JSON
- ✅ 测试连接
- ✅ 保存并添加到工具列表

#### 4.5 全局设置弹窗 (GlobalSettingsModal)

**功能**:

- ✅ 查看当前 MCP 全局配置
- ✅ 显示所有工具的配置（只读）
- ✅ 未来可扩展：导入/导出配置、重置等

#### 4.6 工具开关逻辑

**行为**:

- 启用工具时：调用后端 `POST /mcp/toggle/{tool_name}` 激活
- 禁用工具时：调用后端 API 停用
- 新建对话时：除 Tavily 外，其他工具自动禁用

**后端 API**:

```typescript
POST /mcp/toggle/{tool_name}
{
  "active": true  // 或 false
}

// 响应
{
  "status": "success",
  "active": true
}
```

---

### 5. 学习模式面板

#### 5.1 功能

- ✅ 从左侧弹出，显示课程课件
- ✅ 通过 iframe 加载后端 HTML 内容
- ✅ 支持全屏模式（CSS 模拟）
- ✅ 可拖动调整宽度
- ✅ 缓存破坏机制（`?timestamp=${timestamp}`）

#### 5.2 顶部栏设计

- **标题**: "课程课件"（彩色渐变文字）
- **按钮**: "领取课件&源码"（打开二维码弹窗）
- **图标**: 全屏切换按钮、关闭按钮

#### 5.3 后端 API

```typescript
GET /courseware?timestamp=1234567890
// 返回 HTML 内容
```

---

### 6. UI 组件库

#### 6.1 核心组件

**MessageBubble**:

- 用户消息：右对齐，蓝色气泡
- AI 消息：左对齐，白色背景，支持复杂内容
  - TextBlock：Markdown 渲染
  - ToolCallBlock：卡片形式，展开/折叠

**ToolCard**:

- 显示工具调用信息
- 运行中：显示加载动画
- 完成：显示输入/输出（可展开）
- 代码高亮：使用自定义样式

**CollapsibleSection**:

- 可折叠的区域组件
- 用于思考过程、工具调用详情
- 默认折叠，点击展开

**LoadingIndicator**:

- 三个跳动的圆点
- 显示"AI 正在思考..."

**WelcomeScreen**:

- 无对话时的欢迎界面
- 显示应用介绍、功能说明

**ConfirmDialog**:

- 自定义确认对话框
- 用于删除对话、删除工具等操作
- 支持自定义标题、描述、按钮文字

**QRCodeModal**:

- 显示二维码图片
- 用于"领取课件&源码"功能

#### 6.2 Toast 通知系统

使用 **Sonner** 库：

```typescript
import { toast } from 'sonner@2.0.3';

// 成功通知
toast.success('操作成功', {
  description: '工具已添加',
  duration: 3000
});

// 错误通知
toast.error('操作失败', {
  description: '无法连接到后端',
  duration: 5000
});

// 警告通知
toast.warning('请输入内容');
```

---

### 7. 数据流架构

#### 7.1 前后端通信

**聊天流式通信**:

```
用户输入 → 前端 → POST /chat_stream → 后端 → SSE 流式返回 → 前端渲染
```

**MCP 工具管理**:

```
前端操作 → POST /mcp/* → 后端 → 更新工具状态 → 前端同步
```

#### 7.2 状态管理

使用 React Hooks (`useState`, `useEffect`):

- `conversations`: 所有对话列表
- `activeConversationId`: 当前活跃对话 ID
- `mcpTools`: MCP 工具列表
- `userInput`: 输入框内容
- `isLoading`: 加载状态
- UI 面板状态：`isLeftSidebarOpen`, `isRightSidebarOpen`, `isLearningModeOpen`

#### 7.3 本地存储工具 (`/utils/storage.ts`)

```typescript
export const storage = {
  saveConversations(conversations: Conversation[]): void;
  getConversations(): Conversation[];
  setActiveConversationId(id: string): void;
  getActiveConversationId(): string | null;
  saveMCPTools(tools: MCPTool[]): void;
  getMCPTools(): MCPTool[];
};
```

---

### 8. 后端 API 规范

#### 8.1 聊天接口

**POST /chat_stream**

- 请求体:
  
  ```json
  {
    "query": "用户消息",
    "session_id": "conversation-id"
  }
  ```

- 响应: SSE 流式数据

- Content-Type: `text/event-stream`

#### 8.2 MCP 工具接口

| 接口                        | 方法     | 描述        |
| ------------------------- | ------ | --------- |
| `/mcp/list`               | GET    | 获取工具列表    |
| `/mcp/toggle/{tool_name}` | POST   | 切换工具状态    |
| `/mcp/test_connection`    | POST   | 测试连接      |
| `/mcp/install`            | POST   | 安装/更新工具   |
| `/mcp/{tool_name}`        | DELETE | 删除工具      |
| `/mcp/search_ai`          | POST   | AI 智能搜索工具 |
| `/mcp/install_batch`      | POST   | 批量安装工具    |

#### 8.3 学习模式接口

| 接口            | 方法  | 描述        |
| ------------- | --- | --------- |
| `/courseware` | GET | 获取课件 HTML |

---

### 9. 样式规范

#### 9.1 配色方案

- **主色**: Indigo (`indigo-600`, `indigo-500`)
- **辅助色**: Purple (`purple-600`)
- **背景**: Slate (`slate-50`, `slate-100`)
- **文本**: Slate (`slate-700`, `slate-600`, `slate-500`)
- **边框**: Slate (`slate-200`, `slate-300`)

#### 9.2 动画效果

- `fade-in`: 渐显动画（消息、卡片）
- `animate-pulse`: 脉冲动画（光标、加载点）
- `transition-all duration-300`: 面板滑入/滑出

#### 9.3 排版

- 不使用 Tailwind 字体大小类（`text-xl` 等），使用全局 CSS
- 全局字体设置在 `/styles/globals.css`

---

### 10. 错误处理

#### 10.1 网络错误

- SSE 连接失败：Toast 通知 + 降级到 Mock 模式
- API 调用失败：Toast 通知 + 详细错误信息

#### 10.2 用户输入验证

- 空消息：提示用户输入内容
- 空许愿：提示用户输入需求
- 配置 JSON 错误：显示解析错误信息

---

### 11. 性能优化

#### 11.1 渲染优化

- 消息列表虚拟化（未来可优化）
- 自动滚动节流
- 避免不必要的重渲染

#### 11.2 数据持久化

- 实时保存到 localStorage
- 启动时批量加载
- 数据迁移兼容旧版本

---

### 12. 浏览器兼容性

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ⚠️ 不支持 IE

---

### 13. 未来扩展功能

- [ ] Jupyter Notebook (.ipynb) 支持
- [ ] LaTeX 数学公式渲染
- [ ] 代码执行沙箱
- [ ] 多模态输入（图片上传）
- [ ] 语音输入/输出
- [ ] 主题切换（暗色模式）
- [ ] 导出对话记录
- [ ] 对话搜索功能
- [ ] 云端同步

---

### 14. 文件结构

```
/
├── App.tsx                 # 主应用组件
├── types/
│   └── index.ts           # TypeScript 类型定义
├── components/
│   ├── LeftSidebar.tsx    # 左侧对话列表
│   ├── RightSidebar.tsx   # 右侧 MCP 工具面板
│   ├── MessageBubble.tsx  # 消息气泡组件
│   ├── ToolCard.tsx       # 工具调用卡片
│   ├── LoadingIndicator.tsx
│   ├── WelcomeScreen.tsx
│   ├── CollapsibleSection.tsx
│   ├── WishResultModal.tsx      # 许愿结果弹窗
│   ├── ConfigModal.tsx          # 工具配置弹窗
│   ├── AddToolModal.tsx         # 添加工具弹窗
│   ├── GlobalSettingsModal.tsx  # 全局设置弹窗
│   ├── ConfirmDialog.tsx        # 确认对话框
│   ├── LearningModePanel.tsx    # 学习模式面板
│   ├── QRCodeModal.tsx          # 二维码弹窗
│   └── ui/                      # UI 组件库
├── utils/
│   ├── storage.ts         # LocalStorage 工具
│   ├── markdown.ts        # Markdown 渲染
│   ├── sseClient.ts       # SSE 客户端
│   ├── mcpApi.ts          # MCP API 客户端
│   ├── mcpHelpers.ts      # MCP 数据转换工具
│   ├── streamingAgent.ts  # Mock 流式响应（降级）
│   └── mockAgent.ts       # Mock AI 分析（降级）
└── styles/
    └── globals.css        # 全局样式
```

---

### 15. 关键设计决策

#### 15.1 为什么使用 SSE 而不是 WebSocket？

- 单向数据流，适合流式响应
- 更简单的实现和调试
- 自动重连机制

#### 15.2 为什么使用 LocalStorage？

- 无需后端数据库
- 快速启动，零配置
- 适合桌面应用场景

#### 15.3 为什么自定义 Markdown 渲染？

- 完全控制渲染输出
- 避免引入大型库
- 优化性能和安全性

---

### 16. 开发与调试

#### 16.1 开发环境

```bash
# 启动前端
npm run dev

# 启动后端（需要单独运行）
python backend/main.py  # 示例
```

#### 16.2 调试工具

- React DevTools
- Console 日志（带 emoji 标记）
- Network 面板（查看 SSE 流）

#### 16.3 Mock 模式

- SSE 失败时自动降级到 Mock
- `utils/streamingAgent.ts` 提供模拟流式响应
- `utils/mockAgent.ts` 提供模拟 AI 分析

---

### 17. 安全考虑

- ✅ XSS 防护：Markdown 渲染时过滤危险标签
- ✅ CORS：后端需配置允许前端域名
- ⚠️ 敏感信息：不存储 API 密钥到 localStorage（仅后端管理）
- ⚠️ 输入验证：后端需验证所有用户输入

---

### 18. 总结

这是一个功能完整、架构清晰的 AI Agent 聊天应用前端，核心亮点包括：

1. **流式响应**: 实时展示 AI 思考和工具调用过程
2. **MCP 工具生态**: 用户可自由扩展 Agent 能力
3. **美观交互**: 类 ChatGPT 的用户体验
4. **本地持久化**: 无需登录，数据本地存储
5. **模块化设计**: 组件解耦，易于维护和扩展

**下一步建议**:

- 完善后端 API 文档（对应前端需求）
- 添加单元测试
- 优化大数据量场景性能
- 添加更多 MCP 工具示例

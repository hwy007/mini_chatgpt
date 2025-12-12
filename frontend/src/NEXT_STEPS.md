# 后端接口对接 - 剩余步骤

## ✅ 已完成
1. 修复了 React 导入错误
2. 创建了 API 客户端 (`/utils/mcpApi.ts`)
3. 创建了数据转换辅助函数 (`/utils/mcpHelpers.ts`)
4. 更新了类型定义 (`/types/index.ts`)
5. 更新了 ConfigModal 和 WishResultModal 组件
6. 在 App.tsx 中添加了 `loadMCPTools` 和 `handleTestConnection`

## ⏳ 待完成的后端对接函数

需要替换以下 5 个函数为后端版本：

### 1. 初始化时加载工具列表

在 App.tsx 的 useEffect 中添加对 `loadMCPTools` 的调用：

```typescript
// 在首次加载后调用后端获取工具列表
useEffect(() => {
  loadMCPTools();
}, []);
```

### 2. handleProcessWish - AI 智能推荐

```typescript
const handleProcessWish = async (wish: string) => {
  try {
    const recommendedTools = await mcpApi.searchMCPToolsAI(wish);
    const suggestedTools = recommendedTools.map(convertRecommendedToolToSuggested);
    setWishResultModal({
      isOpen: true,
      result: { wish, suggestedTools }
    });
  } catch (error) {
    console.error('AI search failed:', error);
    toast.error('智能分析失败', {
      description: error instanceof Error ? error.message : '无法连接到服务器',
      duration: 4000,
    });
  }
};
```

### 3. handleConfirmAddTools - 批量安装工具

```typescript
const handleConfirmAddTools = async (selectedIndices: number[]) => {
  if (!wishResultModal.result || selectedIndices.length === 0) return;

  try {
    const toolsToInstall = selectedIndices.map((index) => {
      const tool = wishResultModal.result!.suggestedTools[index];
      return {
        name: tool.name,
        description: tool.description,
        type: (tool.type || 'stdio') as 'stdio' | 'sse',
        config: tool.defaultConfig || tool.config
      };
    });

    await mcpApi.batchInstallMCPTools(toolsToInstall);
    await loadMCPTools(); // 重新加载工具列表

    setWishResultModal({ isOpen: false, result: null });

    const toolNames = toolsToInstall.map((t) => t.name).join('、');
    toast.success(`已新增 ${toolNames}`, {
      description: '工具已添加，默认未激活。请点击工具名称配置后再激活！',
      duration: 4000,
    });
  } catch (error) {
    toast.error('批量添加失败', {
      description: error instanceof Error ? error.message : '无法添加工具',
      duration: 4000,
    });
  }
};
```

### 4. handleToggleTool - 切换工具激活状态（带测试）

```typescript
const handleToggleTool = async (toolId: string) => {
  const tool = mcpTools.find((t) => t.id === toolId);
  if (!tool) return;

  if (!tool.enabled) {
    const toastId = toast.loading(`正在测试 ${tool.name} 连接...`);

    try {
      const backendConfig = convertMCPToolToBackendConfig(tool);
      const result = await mcpApi.testMCPConnection(backendConfig);
      
      if (result.success) {
        await mcpApi.toggleMCPTool(tool.name, true);
        
        toast.success(`${tool.name} 连接测试成功`, {
          id: toastId,
          description: result.message,
          duration: 3000,
        });

        setMcpTools((tools) =>
          tools.map((t) => t.id === toolId ? { ...t, enabled: true } : t)
        );
      } else {
        toast.error(`${tool.name} 连接测试失败`, {
          id: toastId,
          description: result.message,
          duration: 4000,
        });
      }
    } catch (error) {
      toast.error(`${tool.name} 连接测试失败`, {
        id: toastId,
        description: error instanceof Error ? error.message : '请检查配置后重试',
        duration: 4000,
      });
    }
  } else {
    try {
      await mcpApi.toggleMCPTool(tool.name, false);
      setMcpTools((tools) =>
        tools.map((t) => t.id === toolId ? { ...t, enabled: false } : t)
      );
      toast.info(`已停用 ${tool.name}`, { duration: 2000 });
    } catch (error) {
      toast.error('操作失败', {
        description: error instanceof Error ? error.message : '无法停用工具',
        duration: 3000,
      });
    }
  }
};
```

### 5. handleSaveConfig - 保存工具配置

```typescript
const handleSaveConfig = async (toolId: string, description: string, config: string) => {
  try {
    const parsedConfig = JSON.parse(config);
    const tool = mcpTools.find(t => t.id === toolId);
    if (!tool) return;

    await mcpApi.installMCPTool({
      name: tool.name,
      description,
      type: tool.type || 'stdio',
      config: parsedConfig
    });

    setMcpTools((tools) =>
      tools.map((t) =>
        t.id === toolId ? { ...t, description, config: parsedConfig } : t
      )
    );

    toast.success('配置已保存', {
      description: '工具配置更新成功',
      duration: 3000,
    });
  } catch (error) {
    console.error('Save config failed:', error);
    toast.error('保存失败', {
      description: error instanceof Error ? error.message : '配置格式错误',
      duration: 4000,
    });
    throw error;
  }
};
```

### 6. handleConfirmDeleteTool - 删除工具

```typescript
const handleConfirmDeleteTool = async () => {
  const { toolId, toolName } = deleteConfirm;
  if (!toolId || !toolName) return;

  try {
    await mcpApi.deleteMCPTool(toolName);
    setMcpTools((tools) => tools.filter((t) => t.id !== toolId));
    
    toast.success(`已删除工具"${toolName}"`, { duration: 3000 });
  } catch (error) {
    toast.error('删除失败', {
      description: error instanceof Error ? error.message : '无法删除工具',
      duration: 4000,
    });
  } finally {
    setDeleteConfirm({ isOpen: false, toolId: null, toolName: null });
  }
};
```

## 测试流程

完成上述修改后，按照以下步骤测试：

1. **启动后端服务** - 确保 `localhost:8002` 运行正常
2. **打开应用** - 检查工具列表是否从后端加载
3. **测试激活工具** - 点击开关，验证测试连接流程
4. **测试编辑工具** - 点击工具名称，修改配置并保存
5. **测试智能推荐** - 在许愿池输入需求
6. **测试批量添加** - 选择推荐工具并添加
7. **测试删除工具** - 删除工具并验证

所有功能都应该正常工作，且数据与后端同步！

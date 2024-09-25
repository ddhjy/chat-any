# Chat Any

## 简介

**Chat Any** 是一款基于 Raycast 的扩展，旨在帮助用户快速收集选中文件或文件夹的文本内容，并将其汇总到一个集中化的文本文件中。该扩展特别适用于需要快速整理和查看多个文档内容的场景，自动忽略常见的二进制和媒体文件，确保收集过程高效精准。

## 功能

- **内容收集**：自动读取选中的文件或文件夹中的所有文本文件内容。
- **智能过滤**：自动忽略常见的二进制和媒体文件，如图片、音频、视频、压缩包等，避免不必要的干扰。
- **集中存储**：将收集的内容汇总到 `context.txt` 文件中，存储于用户的 `Documents/Chat Any` 目录下。
- **快捷访问**：自动打开存储目录和文本文件，方便用户立即查看和使用。
- **剪贴板支持**：如果未选中文件或文本，可从剪贴板读取内容。

## 安装

### 前提条件

- 已安装 [Raycast](https://www.raycast.com/)。
- 系统支持 Node.js。

### 步骤

1. **克隆项目**：

   ```bash
   git clone https://github.com/yourusername/chat-any.git
   cd chat-any
   ```

2. **安装依赖**：

   ```bash
   npm install
   ```

3. **开发模式**：

   ```bash
   npm run dev
   ```

4. **配置 Raycast**：

   - 打开 Raycast，进入扩展管理。
   - 添加新的脚本命令，指向 `src/chat.ts` 文件。
   - 确保脚本具有执行权限。

## 使用方法

1. **收集文件内容**：

   - 在 Finder 中选中一个或多个文件或文件夹。
   - 使用 Raycast 激活 **Chat Any** 扩展。
   - 执行命令，扩展将自动收集选中的内容并汇总到 `context.txt` 文件中。

2. **查看汇总内容**：

   - 执行命令后，扩展会自动打开 `Documents/Chat Any` 目录和 `context.txt` 文件，方便即时查看。

3. **剪贴板操作**：

   - 如果没有选中文件或文本，扩展将尝试从剪贴板读取内容并汇总。

## 项目结构

```
chat-any/
├── src/
│   └── chat.ts      # 主脚本文件，处理文件读取和内容汇总
├── README.md
├── package.json
└── ...
```

## 贡献

欢迎提出 Issue 或 Pull Request！请确保您的代码遵循项目的编码规范，并附有相应的测试。

### 步骤

1. **Fork 本项目**。
2. **创建新分支**：

   ```bash
   git checkout -b feature/新功能
   ```

3. **提交更改**：

   ```bash
   git commit -m '添加新功能'
   ```

4. **推送分支**：

   ```bash
   git push origin feature/新功能
   ```

5. **创建 Pull Request**。

## 许可证

本项目基于 [MIT 许可证](LICENSE) 开源。

## 联系我们

如果您有任何问题或建议，请通过 [GitHub Issues](https://github.com/yourusername/chat-any/issues) 与我们联系。

---

© 2023 Chat Any 团队
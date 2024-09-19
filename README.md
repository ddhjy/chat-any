# Chat Any

## 简介

**Chat Any** 是一个基于 Raycast 的扩展，旨在帮助用户快速收集选中文件或文件夹的内容，并将其汇总到一个集中化的文本文件中。该扩展特别适用于需要快速整理和查看多个文档内容的场景，支持自动忽略常见的二进制和媒体文件，确保收集过程高效且精准。

## 功能

- **文件内容收集**：自动读取选中的文件或文件夹中的所有文本文件内容。
- **自动忽略**：过滤掉常见的二进制和媒体文件，如图片、音频、视频、压缩包等，避免不必要的内容干扰。
- **智能存储**：将收集的内容汇总到 `context.txt` 文件中，存储于用户的 `Documents/Chat Any` 目录下。
- **快速访问**：自动打开存储目录和文本文件，方便用户立即查看和使用。
- **剪贴板支持**：如果未选中文件或文本，支持从剪贴板读取内容。

## 安装

1. **前提条件**：
   - 已安装 [Raycast](https://www.raycast.com/)。
   - 系统支持 Node.js 和相关依赖。

2. **克隆项目**：
   ```bash
   git clone https://github.com/yourusername/chat-any.git
   cd chat-any
   ```

3. **安装依赖**：
   ```bash
   npm install
   npm run dev
   ```

4. **配置 Raycast**：
   - 打开 Raycast，进入扩展管理。
   - 添加新的 Script Command，指向 `chat.ts` 文件。
   - 确保脚本具有执行权限。

## 使用方法

1. **收集文件内容**：
   - 在 Finder 中选中一个或多个文件或文件夹。
   - 使用 Raycast 激活 **Chat Any** 扩展。
   - 执行命令，扩展将自动收集选中的内容并汇总到 `context.txt` 文件中。

2. **查看汇总内容**：
   - 执行命令后，扩展会自动打开 `Documents/Chat Any` 目录和 `context.txt` 文件，方便用户即时查看。

3. **剪贴板操作**：
   - 如果没有选中文件或文本，扩展将尝试从剪贴板读取内容并汇总。

## 项目结构

```
chat-any/
├── src/
│   └── chat.ts
├── README.md
├── package.json
└── ...
```

- **chat.ts**：主要的脚本文件，处理文件读取、内容汇总和应用交互逻辑。

## 贡献

欢迎任何形式的贡献！请遵循以下步骤：

1. **Fork 项目**。
2. **创建新分支** (`git checkout -b feature/新功能`)。
3. **提交更改** (`git commit -m '添加新功能'`)。
4. **推送分支** (`git push origin feature/新功能`)。
5. **创建 Pull Request**。

请确保所有提交的代码遵循项目的编码规范，并附有相应的测试。

## 许可证

本项目采用 [MIT 许可证](LICENSE)。

## 联系我们

如果您有任何问题或建议，请通过 [GitHub Issues](https://github.com/yourusername/chat-any/issues) 与我们联系。

---

© 2023 Chat Any 团队
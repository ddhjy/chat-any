# Chat Any

## 简介

**Chat Any** 是一款基于 Raycast 的扩展，旨在帮助用户快速收集选中文件、文件夹或文本内容，并将其汇总到一个集中化的文本文件中。

## 功能

- **内容收集**：自动读取选中的文件、文件夹或文本内容。
- **集中编辑**：将收集的内容汇总到 `context.txt` 文件中，存储于用户的 `Documents/Chat Any` 目录下，并用 Cursor 进行编辑。
- **追加内容**：支持将新的内容追加到已有的 `context.txt` 文件中，方便持续编辑。

## 演示


https://github.com/user-attachments/assets/a7611f3d-c84b-437a-a7c2-f55676891012


https://github.com/user-attachments/assets/4e5030a9-b90a-41f2-867f-d2e9afc72088

## 安装

### 前提条件

- 已安装 [Raycast](https://www.raycast.com/)。

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

## 使用方法

1. **收集文件内容**：

   - 在 Finder 中选中一个或多个文件、文件夹或文本。
   - 使用 Raycast 激活 **Chat Any** 扩展。
   - 执行 `Chat` 命令，扩展将自动收集选中的内容并**覆盖**到 `context.txt` 文件中。

2. **追加内容**：

   - 在 Finder 中选中新的文件、文件夹或文本。
   - 使用 Raycast 激活 **Chat Any** 扩展。
   - 执行 `Chat Append` 命令，扩展将自动将选中的内容**追加**到 `context.txt` 文件中。

3. **查看汇总内容**：

   - 执行命令后，扩展会自动打开 `Documents/Chat Any` 目录和 `context.txt` 文件，方便即时查看。

4. **剪贴板操作**：

   - 如果没有选中文件或文本，扩展将尝试从剪贴板读取内容并汇总。

## 项目结构

```
chat-any/
├── src/
│   ├── chat.ts          # 主脚本文件，处理文件读取和内容覆盖
│   ├── chat-append.ts   # 脚本文件，处理内容追加
│   └── common.ts        # 公共函数
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

© 2024 Chat Any 团队

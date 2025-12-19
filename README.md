# Chat Any

**其他语言版本: [中文](README.md), [English](README_en.md).**

> [!NOTE]
> To be a better Copy-Paste Engineer.

## 简介

在日常开发中，我经常需要将复制粘贴各种文本到 Cursor 中去编辑/问答，为了简化这个过程，所以有了 **Chat Any**。

**Chat Any** 是一款基于 Raycast 的扩展，可以将你选中的文本/文件/文件夹压缩到一个文件中，并直接在 Cursor 中打开编辑。

## 功能

- **内容收集**：自动读取选中的文本（/剪切版文本）、文件夹或文件内容。
- **集中编辑**：将收集的内容汇总到 `context.md` 文件中，存储于用户的 `Documents/Chat Any` 目录下，并用 Cursor 编辑。
- **追加内容**：支持将新的内容追加到已有的 `context.md` 文件中，方便持续编辑。

## 演示

### 1. 编辑选中文本

将文本复制粘贴到 Cursor 编辑

https://github.com/user-attachments/assets/a7611f3d-c84b-437a-a7c2-f55676891012

### 2. 选中文件

将文件和文件夹中的文本聚合到一个文本

https://github.com/user-attachments/assets/4e5030a9-b90a-41f2-867f-d2e9afc72088

### 3. 追加模式

利用追加模式，将代码和报错信息聚合到一个文本

https://github.com/user-attachments/assets/7dc16756-3aa9-4bc3-96e2-131fe33f5579

## 安装

### 前提条件

- 已安装 [Raycast](https://www.raycast.com/)。
- 已安装 [Cursor](https://cursor.sh/)。

### 步骤

1. **克隆项目**：

   ```bash
   git clone git@github.com:ddhjy/chat-any.git
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
   - 执行 `Chat` 命令，扩展将自动收集选中的内容并**覆盖**到 `context.md` 文件中。

2. **追加内容**：

   - 在 Finder 中选中新的文件、文件夹或文本。
   - 使用 Raycast 激活 **Chat Any** 扩展。
   - 执行 `Chat Append` 命令，扩展将自动将选中的内容**追加**到 `context.md` 文件中。

3. **查看汇总内容**：

   - 执行命令后，扩展会自动打开 `Documents/Chat Any` 目录和 `context.md` 文件，方便即时查看。

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

如果您有任何问题或建议，请通过 [GitHub Issues](https://github.com/ddhjy/chat-any/issues) 与我们联系。

---

© 2024 Chat Any 团队

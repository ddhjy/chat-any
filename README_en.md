# Chat Any

**Read this in other languages: [中文](README.md), [English](README_en.md).**

> [!NOTE]
> To be a better Copy-Paste Engineer.

## Introduction

**Chat Any** is a Raycast extension, you can compress the selected text/file/folder into a file and edit it directly with Cursor.

## Features

- **Content Collection**: Automatically read selected text (or clipboard text), folders, or file contents.
- **Centralized Editing**: Aggregate the collected content into a `context.md` file, stored in the user's `Documents/Chat Any` directory, and edit it with Cursor.
- **Append Content**: Supports appending new content to the existing `context.md` file for continuous editing.

## Demo

### 1. Edit Selected Text

Copy and paste text into Cursor for editing.

https://github.com/user-attachments/assets/a7611f3d-c84b-437a-a7c2-f55676891012

### 2. Select Files

Aggregate text from files and folders into one text file.

https://github.com/user-attachments/assets/4e5030a9-b90a-41f2-867f-d2e9afc72088

### 3. Append Mode

Use append mode to aggregate code and error messages into one text file.

https://github.com/user-attachments/assets/7dc16756-3aa9-4bc3-96e2-131fe33f5579

## Installation

### Prerequisites

- Installed [Raycast](https://www.raycast.com/).
- Installed [Cursor](https://cursor.sh/).

### Steps

1. **Clone the project**:

   ```bash
   git clone https://github.com/yourusername/chat-any.git
   cd chat-any
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Development mode**:

   ```bash
   npm run dev
   ```

## Usage

1. **Collect File Content**:

   - Select one or more files, folders, or text in Finder.
   - Activate the **Chat Any** extension using Raycast.
   - Execute the `Chat` command; the extension will automatically collect the selected content and **overwrite** the `context.md` file.

2. **Append Content**:

   - Select new files, folders, or text in Finder.
   - Activate the **Chat Any** extension using Raycast.
   - Execute the `Chat Append` command; the extension will automatically **append** the selected content to the `context.md` file.

3. **View Aggregated Content**:

   - After executing the command, the extension will automatically open the `Documents/Chat Any` directory and the `context.md` file for immediate viewing.

4. **Clipboard Operations**:

   - If no files or text are selected, the extension will attempt to read content from the clipboard and aggregate it.

## Project Structure

```
chat-any/
├── src/
│   ├── chat.ts          # Main script file, handles file reading and content overwriting
│   ├── chat-append.ts   # Script file, handles content appending
│   └── common.ts        # Common functions
├── README.md
├── package.json
└── ...
```

## Contribution

We welcome Issues and Pull Requests! Please ensure your code follows the project's coding standards and includes corresponding tests.

### Steps

1. **Fork this project**.

2. **Create a new branch**:

   ```bash
   git checkout -b feature/new-feature
   ```

3. **Commit changes**:

   ```bash
   git commit -m 'Add new feature'
   ```

4. **Push the branch**:

   ```bash
   git push origin feature/new-feature
   ```

5. **Create a Pull Request**.

## License

This project is open-sourced under the [MIT License](LICENSE).

## Contact Us

If you have any questions or suggestions, please contact us via [GitHub Issues](https://github.com/ddhjy/chat-any/issues).

---

© 2024 Chat Any Team

import { showHUD, showToast, Toast, getSelectedFinderItems, getPreferenceValues } from "@raycast/api";
import { createSymlinksForSelectedItems, getFileType } from "./common";
import { promisify } from "util";
import { exec } from "child_process";
import path from "path";
import { homedir } from "os";

// Constants
const CHAT_ANY_PATH = path.join(homedir(), "Documents", "Chat Any");

interface Preferences {
  customEditor?: { name: string; path: string };
}

export default async function Command() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "处理中...",
  });

  try {
    const selectedItems = await getSelectedFinderItems().catch(() => []);

    if (selectedItems.length === 0) {
      await showHUD("没有选中任何文件或文件夹");
      toast.style = Toast.Style.Failure;
      toast.title = "失败";
      toast.message = "请先在 Finder 中选中文件";
      return;
    }

    const result = await createSymlinksForSelectedItems(selectedItems);

    if (selectedItems.length === 1) {
      const itemPath = selectedItems[0].path;
      const fileType = await getFileType(itemPath);

      if (fileType === "file") {
        const execPromise = promisify(exec);
        const preferences = getPreferenceValues<Preferences>();
        const editorApp = preferences.customEditor?.name || "Cursor";
        const fileName = path.basename(itemPath);
        const linkPath = path.join(CHAT_ANY_PATH, fileName);

        await execPromise(`open -a "${editorApp}" "${CHAT_ANY_PATH}" "${linkPath}"`);
      }
    }

    toast.style = Toast.Style.Success;
    toast.title = "成功";
    toast.message = `已创建 ${result.created} 个软链接${result.failed > 0 ? `，${result.failed} 个失败` : ""}`;
  } catch (error) {
    console.error("Link files operation failed", error);
    toast.style = Toast.Style.Failure;
    toast.title = "操作失败";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}

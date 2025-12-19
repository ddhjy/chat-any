/**
 * @file link-files.ts
 * @description Entry point for the 'Link Files' command.
 * Creates symlinks of selected Finder items in the Chat Any directory.
 */

import { showHUD, showToast, Toast, getSelectedFinderItems } from "@raycast/api";
import { createSymlinksForSelectedItems } from "./common";

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

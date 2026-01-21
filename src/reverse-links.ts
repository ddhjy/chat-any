import { confirmAlert, showHUD, showToast, Toast, Alert, Icon } from "@raycast/api";
import { reverseAllSymlinks } from "./common";

export default async function Command() {
    // 二次确认
    const confirmed = await confirmAlert({
        title: "确认反转软链接",
        message: "此操作会将 Chat Any 目录下的所有软链接反转：\n\n• 软链接会变成真实文件\n• 原始文件会变成指向 Chat Any 的软链接\n\n这是一个危险操作，请确认后继续。",
        icon: Icon.Warning,
        primaryAction: {
            title: "确认反转",
            style: Alert.ActionStyle.Destructive,
        },
        dismissAction: {
            title: "取消",
        },
    });

    if (!confirmed) {
        await showHUD("操作已取消");
        return;
    }

    const toast = await showToast({
        style: Toast.Style.Animated,
        title: "反转软链接中...",
    });

    try {
        const result = await reverseAllSymlinks();

        if (result.total === 0) {
            toast.style = Toast.Style.Failure;
            toast.title = "没有找到软链接";
            toast.message = "Chat Any 目录下没有软链接文件";
            return;
        }

        toast.style = Toast.Style.Success;
        toast.title = "反转完成";
        toast.message = `成功反转 ${result.reversed} 个软链接${result.failed > 0 ? `，${result.failed} 个失败` : ""}`;
    } catch (error) {
        console.error("Reverse links operation failed", error);
        toast.style = Toast.Style.Failure;
        toast.title = "操作失败";
        toast.message = error instanceof Error ? error.message : String(error);
    }
}

/**
 * @file chat.ts
 * @description Entry point for the 'Chat' command in the Raycast extension.
 * This command collects selected content (Finder items, text, or clipboard)
 * and overwrites the `context.md` file with it.
 */

import { handleChatOperation } from "./common";

/**
 * Raycast command function that initiates the 'write' operation.
 * It calls the common handler function to gather content and overwrite the context file.
 */
export default async function Command() {
  await handleChatOperation('write');
}
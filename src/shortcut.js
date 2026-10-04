export async function handleScanShortcut(command, { isEnabled, queryTabs, beginOnPage }) {
  if (command !== "scan-region" || !(await isEnabled())) return false;
  const [tab] = await queryTabs({ active: true, lastFocusedWindow: true });
  if (!Number.isInteger(tab?.id)) return false;
  await beginOnPage(tab.id, "BEGIN_OCR_MODE");
  return true;
}

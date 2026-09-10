/** Chrome Web Store listing when published; otherwise on-site install guide. */
export function getExtensionInstallHref(): string {
  const store = process.env.NEXT_PUBLIC_CHROME_STORE_URL?.trim();
  if (store) return store;
  return "/install";
}

export function isChromeStoreLinked(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CHROME_STORE_URL?.trim());
}

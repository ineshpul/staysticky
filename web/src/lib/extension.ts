/** Chrome Web Store ID — same for every install of the published listing. */
export const STORE_EXTENSION_ID = "ehdlfiabnogcehjaglfkkiilhgfpiagi";

export const CHROME_STORE_URL =
  process.env.NEXT_PUBLIC_CHROME_STORE_URL?.trim() ||
  `https://chromewebstore.google.com/detail/stay-sticky/${STORE_EXTENSION_ID}`;

/** Optional unpacked-dev override. The store ID is always also a connect candidate. */
export const PUBLISHED_EXTENSION_ID =
  process.env.NEXT_PUBLIC_EXTENSION_ID?.trim() || STORE_EXTENSION_ID;

/** Chrome Web Store listing when published; otherwise on-site install guide. */
export function getExtensionInstallHref(): string {
  return CHROME_STORE_URL;
}

export function isChromeStoreLinked(): boolean {
  return Boolean(CHROME_STORE_URL);
}

export function getPublishedExtensionId(): string {
  return PUBLISHED_EXTENSION_ID;
}

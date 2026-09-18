import * as cheerio from "cheerio";

export interface ExtractedImage {
  src: string;
  alt: string;
  title?: string;
}

export interface ExtractedHeader {
  level: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  text: string;
}

export interface ExtractedLink {
  url: string;
  text: string;
  rel?: string;
  isExternal: boolean;
  isFile: boolean;
  fileExtension?: string;
}

export interface ParsedPageData {
  title: string;
  description: string;
  headers: ExtractedHeader[];
  headerTexts: string[];
  images: ExtractedImage[];
  hrefs: string[];
  srcs: string[];
  links: ExtractedLink[];
  pageLinks: string[];
  fileLinks: ExtractedLink[];
  text: string;
}

// Common file extensions that indicate downloadable assets or media
const COMMON_FILE_EXTENSIONS = new Set([
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt", "ods", "odp",
  "zip", "tar", "gz", "rar", "7z", "bz2", "xz", "tgz",
  "csv", "json", "xml", "txt", "rtf", "log",
  "png", "jpg", "jpeg", "gif", "svg", "webp", "ico", "bmp", "tiff", "psd",
  "mp3", "wav", "ogg", "flac", "m4a", "aac", "wma",
  "mp4", "webm", "mkv", "avi", "mov", "wmv", "flv",
  "dmg", "exe", "apk", "iso", "bin", "deb", "rpm",
  "epub", "mobi", "azw3"
]);

/**
 * Convert relative or absolute URL string into an absolute HTTP/HTTPS URL path.
 */
export function toAbsoluteUrl(urlStr: string | undefined | null, baseUrl: string): string | null {
  if (!urlStr) return null;
  const trimmed = urlStr.trim();
  if (
    !trimmed ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("javascript:") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("tel:") ||
    trimmed.startsWith("data:")
  ) {
    return null;
  }

  try {
    const resolved = new URL(trimmed, baseUrl);
    if (resolved.protocol === "http:" || resolved.protocol === "https:") {
      // Remove anchor fragments for clean deduplicated crawling URLs
      resolved.hash = "";
      return resolved.href;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Check if a given URL string or MIME type indicates a file.
 */
export function isFileUrl(
  urlStr: string,
  contentType?: string
): { isFile: boolean; extension?: string } {
  if (contentType) {
    const mime = contentType.toLowerCase().split(";")[0].trim();
    if (
      mime.includes("pdf") ||
      mime.includes("zip") ||
      mime.includes("compressed") ||
      mime.includes("octet-stream") ||
      mime.includes("json") ||
      mime.includes("xml") ||
      mime.startsWith("image/") ||
      mime.startsWith("audio/") ||
      mime.startsWith("video/") ||
      mime.includes("spreadsheet") ||
      mime.includes("wordprocessing") ||
      mime.includes("presentation") ||
      mime.includes("csv")
    ) {
      const ext = getExtensionFromUrl(urlStr);
      return { isFile: true, extension: ext };
    }
  }

  const ext = getExtensionFromUrl(urlStr);
  if (ext && COMMON_FILE_EXTENSIONS.has(ext)) {
    return { isFile: true, extension: ext };
  }

  return { isFile: false, extension: ext };
}

function getExtensionFromUrl(urlStr: string): string | undefined {
  try {
    const parsed = new URL(urlStr);
    const pathname = parsed.pathname;
    const lastPart = pathname.split("/").pop();
    if (lastPart && lastPart.includes(".")) {
      const ext = lastPart.split(".").pop()?.toLowerCase();
      if (ext && /^[a-z0-9]{1,10}$/i.test(ext)) {
        return ext;
      }
    }
  } catch {
    // ignore parsing errors
  }
  return undefined;
}

/**
 * Extract <title> from cheerio instance with fallback to open-graph or h1.
 */
export function extractTitle($: cheerio.CheerioAPI): string {
  const titleTag = $("title").first().text().trim();
  if (titleTag) return titleTag;

  const ogTitle = $('meta[property="og:title"]').attr("content")?.trim();
  if (ogTitle) return ogTitle;

  const twitterTitle = $('meta[name="twitter:title"]').attr("content")?.trim();
  if (twitterTitle) return twitterTitle;

  const h1Text = $("h1").first().text().trim();
  if (h1Text) return h1Text;

  return "";
}

/**
 * Extract <meta description> from cheerio instance.
 */
export function extractMetaDescription($: cheerio.CheerioAPI): string {
  const metaDesc = $('meta[name="description"]').attr("content")?.trim();
  if (metaDesc) return metaDesc;

  const ogDesc = $('meta[property="og:description"]').attr("content")?.trim();
  if (ogDesc) return ogDesc;

  const twitterDesc = $('meta[name="twitter:description"]').attr("content")?.trim();
  if (twitterDesc) return twitterDesc;

  return "";
}

/**
 * Extract all headers (h1..h6) from page.
 */
export function extractHeaders($: cheerio.CheerioAPI): ExtractedHeader[] {
  const headers: ExtractedHeader[] = [];

  $("h1, h2, h3, h4, h5, h6").each((_, elem) => {
    const tagName = elem.tagName.toLowerCase() as ExtractedHeader["level"];
    const text = $(elem).text().trim().replace(/\s+/g, " ");
    if (text) {
      headers.push({ level: tagName, text });
    }
  });

  return headers;
}

/**
 * Extract all <img> elements with absolute src URLs.
 */
export function extractImages($: cheerio.CheerioAPI, baseUrl: string): ExtractedImage[] {
  const images: ExtractedImage[] = [];
  const seenSrcs = new Set<string>();

  $("img").each((_, elem) => {
    const rawSrc = $(elem).attr("src") || $(elem).attr("data-src") || $(elem).attr("srcset")?.split(" ")[0];
    const absSrc = toAbsoluteUrl(rawSrc, baseUrl);
    if (absSrc && !seenSrcs.has(absSrc)) {
      seenSrcs.add(absSrc);
      const alt = $(elem).attr("alt")?.trim() || "";
      const title = $(elem).attr("title")?.trim();
      images.push({
        src: absSrc,
        alt,
        ...(title ? { title } : {}),
      });
    }
  });

  return images;
}

/**
 * Extract all href attributes as absolute URLs.
 */
export function extractHrefs($: cheerio.CheerioAPI, baseUrl: string): string[] {
  const hrefs = new Set<string>();

  $("[href]").each((_, elem) => {
    const rawHref = $(elem).attr("href");
    const absUrl = toAbsoluteUrl(rawHref, baseUrl);
    if (absUrl) {
      hrefs.add(absUrl);
    }
  });

  return Array.from(hrefs);
}

/**
 * Extract all src attributes as absolute URLs.
 */
export function extractSrcs($: cheerio.CheerioAPI, baseUrl: string): string[] {
  const srcs = new Set<string>();

  $("[src]").each((_, elem) => {
    const rawSrc = $(elem).attr("src");
    const absUrl = toAbsoluteUrl(rawSrc, baseUrl);
    if (absUrl) {
      srcs.add(absUrl);
    }
  });

  return Array.from(srcs);
}

/**
 * Parse HTML content and return full structured data including titles, headers, images, hrefs, srcs, and link classification.
 */
export function parseHtml(html: string, baseUrl: string, contentType?: string): ParsedPageData {
  const $ = cheerio.load(html);

  let baseHost = "";
  try {
    baseHost = new URL(baseUrl).hostname.toLowerCase();
  } catch {
    // ignore
  }

  const title = extractTitle($);
  const description = extractMetaDescription($);
  const headers = extractHeaders($);
  const headerTexts = headers.map((h) => h.text);
  const images = extractImages($, baseUrl);
  const hrefs = extractHrefs($, baseUrl);
  const srcs = extractSrcs($, baseUrl);

  const linksMap = new Map<string, ExtractedLink>();
  const pageLinksSet = new Set<string>();
  const fileLinks: ExtractedLink[] = [];

  $("a[href]").each((_, elem) => {
    const rawHref = $(elem).attr("href");
    const absUrl = toAbsoluteUrl(rawHref, baseUrl);
    if (!absUrl) return;

    const linkText = $(elem).text().trim().replace(/\s+/g, " ");
    const rel = $(elem).attr("rel")?.trim();

    let isExternal = false;
    try {
      const linkHost = new URL(absUrl).hostname.toLowerCase();
      if (baseHost && linkHost !== baseHost && !linkHost.endsWith("." + baseHost)) {
        isExternal = true;
      }
    } catch {
      // ignore
    }

    const fileCheck = isFileUrl(absUrl, contentType);

    const linkItem: ExtractedLink = {
      url: absUrl,
      text: linkText,
      ...(rel ? { rel } : {}),
      isExternal,
      isFile: fileCheck.isFile,
      ...(fileCheck.extension ? { fileExtension: fileCheck.extension } : {}),
    };

    if (!linksMap.has(absUrl)) {
      linksMap.set(absUrl, linkItem);

      if (fileCheck.isFile) {
        fileLinks.push(linkItem);
      } else {
        pageLinksSet.add(absUrl);
      }
    }
  });

  // Extract clean readable text from body
  $("script, style, noscript, iframe, svg").remove();
  const text = $("body").text().replace(/\s+/g, " ").trim();

  return {
    title,
    description,
    headers,
    headerTexts,
    images,
    hrefs,
    srcs,
    links: Array.from(linksMap.values()),
    pageLinks: Array.from(pageLinksSet),
    fileLinks,
    text,
  };
}

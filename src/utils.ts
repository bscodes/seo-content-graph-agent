export const escapeHtml = (unsafe: string) => {
  return unsafe
       .replace(/&/g, "&amp;")
       .replace(/</g, "&lt;")
       .replace(/>/g, "&gt;")
       .replace(/"/g, "&quot;")
       .replace(/'/g, "&#039;");
};

export const ensureHttpsUrl = (url: string) => {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      return '#';
    }
    if (parsedUrl.protocol !== 'https:') {
      return `https://${parsedUrl.hostname}${parsedUrl.pathname}${parsedUrl.search}`;
    }
    return url;
  } catch {
    return '#';
  }
};

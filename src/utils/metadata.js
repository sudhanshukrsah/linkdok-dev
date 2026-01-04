// Fetch metadata from URL using Open Graph protocol and fallbacks
export const fetchLinkMetadata = async (url) => {
  try {
    // Use a CORS proxy or API to fetch metadata
    // For demo, we'll use a simple approach with allorigins.win
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    
    const response = await fetch(proxyUrl);
    const data = await response.json();
    
    if (!data.contents) {
      throw new Error('Failed to fetch page');
    }

    const html = data.contents;
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Extract metadata
    const getMetaContent = (property) => {
      const meta = doc.querySelector(`meta[property="${property}"]`) ||
                    doc.querySelector(`meta[name="${property}"]`);
      return meta ? meta.getAttribute('content') : null;
    };

    const title = getMetaContent('og:title') || 
                  getMetaContent('twitter:title') || 
                  doc.querySelector('title')?.textContent || 
                  '';

    const description = getMetaContent('og:description') || 
                       getMetaContent('twitter:description') || 
                       getMetaContent('description') || 
                       '';

    const image = getMetaContent('og:image') || 
                  getMetaContent('twitter:image') || 
                  '';

    // Get favicon
    const favicon = doc.querySelector('link[rel="icon"]')?.href || 
                   doc.querySelector('link[rel="shortcut icon"]')?.href ||
                   `${new URL(url).origin}/favicon.ico`;

    return {
      title: title.trim(),
      description: description.trim(),
      image: image || favicon,
      favicon: favicon
    };
  } catch (error) {
    console.error('Error fetching metadata:', error);
    
    // Fallback: try to get at least the domain name
    try {
      const urlObj = new URL(url);
      return {
        title: urlObj.hostname.replace('www.', ''),
        description: '',
        image: `${urlObj.origin}/favicon.ico`,
        favicon: `${urlObj.origin}/favicon.ico`
      };
    } catch {
      return null;
    }
  }
};

// Generate a color based on URL (for fallback when no image)
export const getColorFromUrl = (url) => {
  const colors = [
    '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', 
    '#10b981', '#06b6d4', '#6366f1', '#ef4444'
  ];
  
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    hash = url.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

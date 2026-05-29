export const formatImageUrl = (url) => {
  if (!url) return '';
  try {
    // 1. https://drive.google.com/file/d/FILE_ID/view...
    const driveFileRegex = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
    const match1 = url.match(driveFileRegex);
    if (match1 && match1[1]) return `https://drive.google.com/uc?export=view&id=${match1[1]}`;
    
    // 2. https://drive.google.com/open?id=FILE_ID
    const driveOpenRegex = /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/;
    const match2 = url.match(driveOpenRegex);
    if (match2 && match2[1]) return `https://drive.google.com/uc?export=view&id=${match2[1]}`;
    
    // 3. https://drive.google.com/uc?id=FILE_ID (missing export=view)
    const driveUcRegex = /drive\.google\.com\/uc\?id=([a-zA-Z0-9_-]+)/;
    const match3 = url.match(driveUcRegex);
    if (match3 && match3[1] && !url.includes('export=view')) return `https://drive.google.com/uc?export=view&id=${match3[1]}`;
  } catch (e) {
    console.error('Error formatting image URL', e);
  }
  return url;
};

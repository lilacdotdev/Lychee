// src/lib/tagFormatter.ts

export function formatTagName(tagName: string): string {
  return tagName
    .replace(/\s+/g, '-')
    .toLowerCase()
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('-');
}

export function parseAndFormatTags(tagsString: string): string[] {
  if (!tagsString.trim()) return [];
  
  return tagsString
    .split(',')
    .map(tag => formatTagName(tag.trim()))
    .filter(tag => tag.length > 0);
}
// src/lib/markdown.ts

import { marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';
import katex from 'katex';
import DOMPurify from 'dompurify';

// Import CSS for syntax highlighting and math
import 'highlight.js/styles/github-dark.css';
import 'katex/dist/katex.min.css';

// Configure marked with basic options
marked.setOptions({
  breaks: true,
  gfm: true,
});

// Add syntax highlighting extension
marked.use(markedHighlight({
  langPrefix: 'hljs language-',
  highlight(code, lang) {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    return hljs.highlight(code, { language }).value;
  }
}));

/**
 * Parses a raw Markdown string into sanitized HTML with enhanced features.
 * @param markdown The raw Markdown string to parse.
 * @returns A string of sanitized HTML.
 */
export function parseMarkdown(markdown: string): string {
  try {
    // Ensure we have a valid string
    if (typeof markdown !== 'string') {
      console.warn('parseMarkdown received non-string input:', typeof markdown, markdown);
      return '<p class="markdown-error">Invalid content type</p>';
    }
    
    // Simple markdown parsing without complex extensions
    const rawHtml = marked(markdown);
    
    // Basic DOMPurify configuration
    const cleanHtml = DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'br', 'strong', 'em', 'u', 's', 'del', 'ins',
        'ul', 'ol', 'li',
        'a', 'img',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'blockquote', 'hr',
        'pre', 'code', 'span', 'div'
      ],
      ALLOWED_ATTR: [
        'href', 'src', 'alt', 'title', 'target', 'rel',
        'class', 'id'
      ]
    });
    
    return cleanHtml;
  } catch (error) {
    console.error('Markdown rendering error:', error);
    return `<p class="markdown-error">Error rendering markdown: ${error}</p>`;
  }
}

// Alternative function name for backward compatibility
export function renderMarkdown(content: string): string {
  return parseMarkdown(content);
}

// Utility function to extract plain text from markdown (for previews)
export function extractPlainText(markdown: string): string {
  // Ensure we have a valid string
  if (typeof markdown !== 'string') {
    console.warn('extractPlainText received non-string input:', typeof markdown, markdown);
    return String(markdown || '');
  }
  
  // Remove markdown syntax for a plain text preview
  return markdown
    .replace(/#{1,6}\s+/g, '') // Remove headers
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
    .replace(/\*(.*?)\*/g, '$1') // Remove italic
    .replace(/`(.*?)`/g, '$1') // Remove inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
    .replace(/^\s*[-*+]\s+/gm, '') // Remove list markers
    .replace(/^\s*\d+\.\s+/gm, '') // Remove numbered list markers
    .replace(/```[\s\S]*?```/g, '[code block]') // Replace code blocks
    .replace(/\$\$[\s\S]*?\$\$/g, '[math]') // Replace block math
    .replace(/\$[^$]+\$/g, '[math]') // Replace inline math
    .trim();
}
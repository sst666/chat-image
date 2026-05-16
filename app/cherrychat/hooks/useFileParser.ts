"use client";

import { useCallback } from 'react';
import type { ParsedFileAttachment } from '../types';

const MAX_FILE_CHARS = 6000;
const MAX_TOTAL_CHARS = 24000;

function extOf(filename: string) {
  const i = filename.lastIndexOf('.');
  return i === -1 ? '' : filename.slice(i + 1).toLowerCase();
}

function decodeXmlEntities(input: string) {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function trimText(text: string, max = MAX_FILE_CHARS) {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max)}\n\n[内容过长，已截断]`;
}

export function useFileParser() {
  const parseDocx = useCallback(async (file: File) => {
    const mammothMod = await import('mammoth/mammoth.browser');
    const mammothAny = mammothMod as unknown as {
      extractRawText?: (input: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>;
      default?: {
        extractRawText?: (input: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>;
      };
    };
    const extract = mammothAny.extractRawText || mammothAny.default?.extractRawText;
    if (!extract) throw new Error('DOCX 解析器不可用');
    const buffer = await file.arrayBuffer();
    const result = await extract({ arrayBuffer: buffer });
    return trimText(result.value || '');
  }, []);

  const parseExcel = useCallback(async (file: File) => {
    const XLSX = await import('xlsx');
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetTexts = workbook.SheetNames.slice(0, 4).map((name) => {
      const sheet = workbook.Sheets[name];
      const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
      return `## 工作表: ${name}\n${trimText(csv, 3000)}`;
    });
    return trimText(sheetTexts.join('\n\n'), MAX_FILE_CHARS);
  }, []);

  const parsePptx = useCallback(async (file: File) => {
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const slideFiles = Object.keys(zip.files)
      .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
      .sort((a, b) => {
        const ai = Number((a.match(/slide(\d+)\.xml/i) || [])[1] || 0);
        const bi = Number((b.match(/slide(\d+)\.xml/i) || [])[1] || 0);
        return ai - bi;
      });

    const texts: string[] = [];
    for (const [idx, name] of slideFiles.entries()) {
      const xml = await zip.files[name].async('string');
      const hits = Array.from(xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)).map((m) => decodeXmlEntities(m[1] || '').trim()).filter(Boolean);
      if (hits.length) {
        texts.push(`## 第 ${idx + 1} 页\n${trimText(hits.join('\n'), 2000)}`);
      }
    }

    if (!texts.length) return '未提取到可读文本（该 PPT 可能主要是图片）。';
    return trimText(texts.join('\n\n'), MAX_FILE_CHARS);
  }, []);

  const parseZip = useCallback(async (file: File) => {
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const names = Object.keys(zip.files).filter((name) => !zip.files[name].dir);
    const previewFiles = names.slice(0, 80);
    const textExt = new Set(['txt', 'md', 'csv', 'json', 'xml', 'html', 'log']);

    const previews: string[] = [];
    for (const name of previewFiles.slice(0, 6)) {
      const ext = extOf(name);
      if (!textExt.has(ext)) continue;
      try {
        const content = await zip.files[name].async('string');
        previews.push(`### ${name}\n${trimText(content, 1200)}`);
      } catch {
        // ignore bad entry
      }
    }

    const listText = previewFiles.map((n) => `- ${n}`).join('\n');
    const body = [`压缩包文件清单（最多展示80个）:`, listText, previews.length ? '\n可读文本预览:\n' + previews.join('\n\n') : ''].filter(Boolean).join('\n');
    return trimText(body, MAX_FILE_CHARS);
  }, []);

  const parseSingleFile = useCallback(
    async (file: File): Promise<ParsedFileAttachment> => {
      const ext = extOf(file.name);
      let content = '';

      if (file.type.startsWith('text/') || ['txt', 'md', 'json', 'xml', 'log'].includes(ext)) {
        content = trimText(await file.text());
      } else if (file.type === 'text/csv' || ext === 'csv') {
        content = trimText(await file.text());
      } else if (ext === 'docx') {
        content = await parseDocx(file);
      } else if (ext === 'xlsx' || ext === 'xls') {
        content = await parseExcel(file);
      } else if (ext === 'pptx') {
        content = await parsePptx(file);
      } else if (ext === 'zip') {
        content = await parseZip(file);
      } else if (ext === 'doc' || ext === 'ppt') {
        content = `该文件为 .${ext} 老格式，当前仅支持 docx / pptx，请另存为新格式后重试。`;
      } else {
        throw new Error(`暂不支持文件类型: ${file.name}`);
      }

      return {
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        content,
      };
    },
    [parseDocx, parseExcel, parsePptx, parseZip]
  );

  const parseFiles = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files);
      const parsed: ParsedFileAttachment[] = [];
      let totalChars = 0;

      for (const file of arr) {
        const item = await parseSingleFile(file);
        totalChars += item.content.length;
        if (totalChars > MAX_TOTAL_CHARS) {
          item.content = trimText(item.content, Math.max(1000, MAX_TOTAL_CHARS - (totalChars - item.content.length)));
          parsed.push(item);
          break;
        }
        parsed.push(item);
      }

      return parsed;
    },
    [parseSingleFile]
  );

  return { parseFiles };
}

"use client";

import { useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/legacy/build/pdf.worker.min.mjs`;

export function usePdf() {
  const pdfToImages = useCallback(
    async (file: File): Promise<string[]> => {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const images: string[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const ctx = canvas.getContext('2d')!;
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;

        images.push(canvas.toDataURL('image/png'));
      }

      return images;
    },
    []
  );

  return { pdfToImages };
}

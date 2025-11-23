import { toPng } from "html-to-image";

export const captureChartAsImage = async (selector: string): Promise<string | null> => {
  try {
    const element = document.querySelector(selector);
    if (!element) {
      console.warn(`Element not found: ${selector}`);
      return null;
    }

    const dataUrl = await toPng(element as HTMLElement, {
      quality: 0.95,
      pixelRatio: 2,
    });

    return dataUrl;
  } catch (error) {
    console.error("Error capturing chart:", error);
    return null;
  }
};

export const captureMultipleCharts = async (selectors: string[]): Promise<Record<string, string | null>> => {
  const results: Record<string, string | null> = {};

  for (const selector of selectors) {
    results[selector] = await captureChartAsImage(selector);
  }

  return results;
};

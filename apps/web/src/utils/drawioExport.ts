export function sanitizeFilename(name: string): string {
  const normalized = name.normalize("NFC");
  const cleaned = normalized
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned || "diagram";
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function extractDrawioPages(xmlString: string): Array<{ index: number; id: string; name: string }> {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, "application/xml");
    const diagramNodes = Array.from(doc.getElementsByTagName("diagram"));
    return diagramNodes.map((node, index) => ({
      index,
      id: node.getAttribute("id") || `page-${index + 1}`,
      name: node.getAttribute("name") || `Page ${index + 1}`,
    }));
  } catch {
    return [];
  }
}

export async function exportCurrentPageSvg(
  viewer: any,
  baseName: string,
  pageName: string,
): Promise<void> {
  let svg: SVGSVGElement | null = null;
  if (viewer?.graph?.getSvg) {
    try {
      svg = viewer.graph.getSvg("#ffffff", 1, 10, true);
    } catch {
      svg = null;
    }
  }

  if (!svg) {
    const activeSvg =
      viewer?.graph?.view?.getDrawPane()?.ownerSVGElement ||
      viewer?.graph?.container?.querySelector("svg");
    if (activeSvg) {
      svg = activeSvg.cloneNode(true) as SVGSVGElement;
    }
  }

  if (!svg) {
    throw new Error("Không tìm thấy phần tử SVG để xuất.");
  }

  if (!svg.getAttribute("xmlns")) {
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  }
  if (!svg.getAttribute("xmlns:xlink")) {
    svg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  }

  const serializer = new XMLSerializer();
  const serialized = '<?xml version="1.0" encoding="UTF-8"?>\n' + serializer.serializeToString(svg);
  const blob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
  const filename = `${sanitizeFilename(baseName)}__${sanitizeFilename(pageName)}.svg`;
  downloadBlob(blob, filename);
}

export async function exportCurrentPagePng(
  viewer: any,
  baseName: string,
  pageName: string,
  scale = 2,
): Promise<void> {
  let originalFoEnabled: boolean | undefined = undefined;
  const mxSvgCanvas2D = (window as any).mxSvgCanvas2D;
  if (mxSvgCanvas2D && mxSvgCanvas2D.prototype) {
    originalFoEnabled = mxSvgCanvas2D.prototype.foEnabled;
  }

  let svg: SVGSVGElement | null = null;
  try {
    if (mxSvgCanvas2D && mxSvgCanvas2D.prototype) {
      mxSvgCanvas2D.prototype.foEnabled = false;
    }

    if (viewer?.graph?.getSvg) {
      svg = viewer.graph.getSvg("#ffffff", scale, 10, true);
    } else {
      const activeSvg =
        viewer?.graph?.view?.getDrawPane()?.ownerSVGElement ||
        viewer?.graph?.container?.querySelector("svg");
      if (activeSvg) {
        svg = activeSvg.cloneNode(true) as SVGSVGElement;
      }
    }
  } finally {
    if (mxSvgCanvas2D && mxSvgCanvas2D.prototype && originalFoEnabled !== undefined) {
      mxSvgCanvas2D.prototype.foEnabled = originalFoEnabled;
    }
  }

  if (!svg) {
    throw new Error("Không tìm thấy phần tử SVG để xuất.");
  }

  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  if (!svg.getAttribute("xmlns")) {
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  }
  if (!svg.getAttribute("xmlns:xlink")) {
    svg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  }

  const serializer = new XMLSerializer();
  const serialized = serializer.serializeToString(svg);
  const svgBlob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Lỗi khi kết xuất SVG sang hình ảnh"));
    img.src = svgUrl;
  });

  const viewBox = svg.getAttribute("viewBox");
  let width = img.naturalWidth || 800;
  let height = img.naturalHeight || 600;

  if (viewBox) {
    const parts = viewBox.split(/[\s,]+/).map(parseFloat);
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
      width = parts[2];
      height = parts[3];
    }
  }

  const maxDimension = 8192;
  const safeScale = Math.min(scale, maxDimension / Math.max(width, height));
  const canvasWidth = Math.max(1, Math.round(width * safeScale));
  const canvasHeight = Math.max(1, Math.round(height * safeScale));

  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    URL.revokeObjectURL(svgUrl);
    throw new Error("Không thể khởi tạo Canvas 2D context");
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
  URL.revokeObjectURL(svgUrl);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );

  if (!blob) {
    throw new Error("Lỗi tạo dữ liệu ảnh PNG");
  }

  const filename = `${sanitizeFilename(baseName)}__${sanitizeFilename(pageName)}.png`;
  downloadBlob(blob, filename);
}

export function exportCurrentPageDrawio(
  fullXml: string,
  pageIndex: number,
  baseName: string,
  pageName: string,
): void {
  const parser = new DOMParser();
  const doc = parser.parseFromString(fullXml, "application/xml");
  const diagramNodes = Array.from(doc.getElementsByTagName("diagram"));
  const targetNode = diagramNodes[pageIndex] || diagramNodes[0];

  if (!targetNode) {
    throw new Error("Không tìm thấy trang để xuất.");
  }

  const originalMxfile = doc.getElementsByTagName("mxfile")[0];
  const host = originalMxfile?.getAttribute("host") || "app.diagrams.net";
  const agent = originalMxfile?.getAttribute("agent") || "Reported";
  const version = originalMxfile?.getAttribute("version") || "24.0.0";

  const newDoc = document.implementation.createDocument(null, "mxfile", null);
  const root = newDoc.documentElement;
  root.setAttribute("host", host);
  root.setAttribute("agent", agent);
  root.setAttribute("version", version);
  root.setAttribute("pages", "1");
  root.appendChild(newDoc.importNode(targetNode.cloneNode(true), true));

  const serializer = new XMLSerializer();
  const serialized = '<?xml version="1.0" encoding="UTF-8"?>\n' + serializer.serializeToString(newDoc);
  const blob = new Blob([serialized], { type: "application/vnd.jgraph.mxfile;charset=utf-8" });
  const filename = `${sanitizeFilename(baseName)}__${sanitizeFilename(pageName)}.drawio`;
  downloadBlob(blob, filename);
}

export function exportFullDrawio(fullXml: string, baseName: string): void {
  const blob = new Blob([fullXml], { type: "application/vnd.jgraph.mxfile;charset=utf-8" });
  const filename = `${sanitizeFilename(baseName)}.drawio`;
  downloadBlob(blob, filename);
}

/**
 * Turn the on-screen picture into a PNG. Colours come from CSS variables, which
 * a standalone image can't see, so each element's computed fill/stroke is
 * copied onto the clone before rendering.
 */
export async function renderSvgToPng(svg: SVGSVGElement, size = 1200): Promise<Blob> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const source = svg.querySelectorAll<SVGElement>("*");
  const target = clone.querySelectorAll<SVGElement>("*");
  source.forEach((el, i) => {
    const copy = target[i];
    if (!copy) return;
    const computed = window.getComputedStyle(el);
    for (const prop of ["fill", "stroke"] as const) {
      const value = computed.getPropertyValue(prop);
      if (value) copy.style.setProperty(prop, value);
    }
  });
  clone.querySelectorAll("[data-export-ignore]").forEach((n) => n.remove());
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(size));
  clone.setAttribute("height", String(size));
  clone.removeAttribute("class");

  const xml = new XMLSerializer().serializeToString(clone);
  const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Could not draw the picture"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");
    ctx.drawImage(img, 0, 0, size, size);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not create image"))), "image/png"),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export type SaveResult = "shared" | "downloaded" | "cancelled";

/** On phones, open the share sheet (which offers "Save Image"); elsewhere download. */
export async function saveImage(blob: Blob, filename: string): Promise<SaveResult> {
  const file = new File([blob], filename, { type: "image/png" });
  const isTouch = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  if (isTouch && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "My symbol picture" });
      return "shared";
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return "cancelled";
      // Fall through to a regular download.
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  return "downloaded";
}
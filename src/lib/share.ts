/** Browser-only helpers for sharing a picture (and text) to WhatsApp. */

export function downloadBlob(blob: Blob, fileName: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

export const whatsappTextUrl = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;

/**
 * Opens the phone's share sheet with the picture + message (WhatsApp is one of the choices).
 * Where picture sharing is not supported (most desktop browsers) the picture is saved instead and
 * WhatsApp opens with the text, so the picture can be attached by hand.
 */
export async function shareImage(blob: Blob, fileName: string, text: string): Promise<"shared" | "cancelled" | "downloaded"> {
  const file = new File([blob], fileName, { type: blob.type || "image/png" });
  if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
      return "shared";
    } catch (e) {
      if ((e as DOMException)?.name === "AbortError") return "cancelled";
      // any other failure: fall through to the download route
    }
  }
  downloadBlob(blob, fileName);
  window.open(whatsappTextUrl(text), "_blank", "noopener");
  return "downloaded";
}

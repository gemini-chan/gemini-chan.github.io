/**
 * Zip loader integration for pixi-live2d-display using JSZip.
 *
 * This configures the library to read .zip model files directly by
 * supplying a JSZip-based reader. If a model URL ends with .zip,
 * ensure this module is imported before Live2DModel.from(url).
 */

// Lazy import JSZip only when this module is imported
import JSZip from 'jszip';

async function getZipLoader(): Promise<any> {
  try {
    // Try the base package first
    const base = await import('pixi-live2d-display');
    if ((base as any).ZipLoader) return (base as any).ZipLoader;
  } catch {}
  try {
    // Fallback to cubism4 bundle which also exposes ZipLoader in some builds
    const c4 = await import('pixi-live2d-display/cubism4');
    if ((c4 as any).ZipLoader) return (c4 as any).ZipLoader;
  } catch {}
  throw new Error('ZipLoader not found in pixi-live2d-display');
}

// Configure the zip reader one time per app lifetime
let configured = false;
export async function configureZipLoader() {
  if (configured) return;
  const ZipLoader = await getZipLoader();

  // Provide a JSZip-based reader for ArrayBuffer/Blob inputs
  ZipLoader.zipReader = async (data: ArrayBuffer | Blob) => {
    const buf = data instanceof Blob ? await data.arrayBuffer() : data;
    return JSZip.loadAsync(buf);
  };

  // Leave createSettings as default (library will read model3.json from zip)
  // If needed, we can patch createSettings to synthesize settings when missing.

  configured = true;
}

// Auto-configure on side-effect import
configureZipLoader().catch((e) => console.warn('[Live2D] ZipLoader config failed', e));

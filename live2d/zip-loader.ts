/**
 * Zip loader integration for pixi-live2d-display using JSZip.
 *
 * This configures the library to read .zip model files directly by
 * supplying a JSZip-based reader. If a model URL ends with .zip,
 * ensure this module is imported before Live2DModel.from(url).
 */

// Lazy-load JSZip from CDN at runtime to avoid bundling dependency issues
async function loadJSZip(): Promise<any> {
  const w = window as any;
  if (w.JSZip) return w.JSZip;
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load JSZip'));
    document.head.appendChild(s);
  });
  return (window as any).JSZip;
}

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
    const JSZip = await loadJSZip();
    return JSZip.loadAsync(buf);
  };

  // Map zip entries to file paths
  ZipLoader.getFilePaths = async (zip: any) => {
    const files = zip?.files ?? {};
    return Object.keys(files).filter((k) => !files[k]?.dir);
  };

  // Read a file from zip with desired type
  ZipLoader.readFile = async (zip: any, path: string, type: 'text' | 'json' | 'arraybuffer' | 'blob' = 'blob') => {
    const file = zip.file(path);
    if (!file) return null;
    switch (type) {
      case 'text':
        return file.async('string');
      case 'json':
        return JSON.parse(await file.async('string'));
      case 'arraybuffer':
        return file.async('arraybuffer');
      case 'blob':
      default:
        return new Blob([await file.async('arraybuffer')]);
    }
  };

  // Create settings JSON when model3.json is missing
  ZipLoader.createSettings = async (zip: any, filePaths: string[]) => {
    const modelJsonPath = filePaths.find((p) => p.toLowerCase().endsWith('.model3.json'));
    if (modelJsonPath) {
      return ZipLoader.readFile(zip, modelJsonPath, 'json');
    }

    // Fallback synthesis: pick first .moc3 and textures
    const moc3 = filePaths.find((p) => p.toLowerCase().endsWith('.moc3'));
    const textures = filePaths
      .filter((p) => /texture_\d+\.png$/i.test(p))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    if (moc3 && textures.length) {
      return {
        FileReferences: {
          Moc: moc3,
          Textures: textures,
        },
        Groups: [],
      };
    }

    throw new Error('No model3.json found and unable to synthesize settings');
  };

  configured = true;
}

// Auto-configure on side-effect import
configureZipLoader().catch((e) => console.warn('[Live2D] ZipLoader config failed', e));

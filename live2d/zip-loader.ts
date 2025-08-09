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
  ZipLoader.createSettings = async (zip: any, filePaths?: string[]) => {
    const paths = filePaths ?? (await ZipLoader.getFilePaths(zip));
    const modelJsonPath = paths.find((p: string) => p.toLowerCase().endsWith('.model3.json'));

    const readSettingsJson = async (p: string) => {
      try {
        const json = await ZipLoader.readFile(zip, p, 'json');
        return json;
      } catch (e) {
        return undefined;
      }
    };

    let settingsJson: any | undefined;

    if (modelJsonPath) {
      settingsJson = await readSettingsJson(modelJsonPath);
    }

    // Fallback synthesis when model3.json missing or unreadable
    if (!settingsJson) {
      const moc3 = paths.find((p: string) => p.toLowerCase().endsWith('.moc3'));
      const textures = paths
        .filter((p: string) => /texture_\d+\.png$/i.test(p))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

      if (moc3 && textures.length) {
        settingsJson = {
          FileReferences: {
            Moc: moc3,
            Textures: textures,
          },
          Groups: [],
        };
      } else {
        throw new Error('No model3.json found and unable to synthesize settings');
      }
    }

    // Wrap the JSON with a minimal interface expected by pixi-live2d-display
    const fr = settingsJson.FileReferences ?? {};
    const wrapper = {
      json: settingsJson,
      url: modelJsonPath || '.',
      getDefinedFiles: (..._args: any[]) => {
        const files: string[] = [];
        if (fr.Moc) files.push(fr.Moc);
        if (Array.isArray(fr.Textures)) files.push(...fr.Textures);
        if (fr.Physics) files.push(fr.Physics);
        if (fr.Pose) files.push(fr.Pose);
        if (fr.UserData) files.push(fr.UserData);
        if (fr.Motions) {
          for (const key of Object.keys(fr.Motions)) {
            const list = fr.Motions[key];
            if (Array.isArray(list)) {
              for (const m of list) {
                if (m?.File) files.push(m.File);
              }
            }
          }
        }
        if (fr.Expressions) {
          for (const key of Object.keys(fr.Expressions)) {
            const list = fr.Expressions[key];
            if (Array.isArray(list)) {
              for (const ex of list) {
                if (ex?.File) files.push(ex.File);
              }
            }
          }
        }
        return files;
      },
    };
    return wrapper;
  };

  // Provide files as blob URLs for loader consumption
  ZipLoader.getFiles = async (zip: any, settings?: any) => {
    const collect = settings?.getDefinedFiles ? (settings.getDefinedFiles() as string[]) : ((await ZipLoader.getFilePaths(zip)) as string[]);
    const unique: string[] = Array.from(new Set<string>(collect)).filter((v): v is string => typeof v === 'string' && v.length > 0);
    const out: Record<string, string> = {};
    for (const p of unique) {
      try {
        const blob = (await ZipLoader.readFile(zip, p, 'blob')) as Blob | null;
        if (blob) out[p] = URL.createObjectURL(blob);
      } catch (e) {
        // ignore missing
      }
    }
    return out;
  };

  configured = true;
}

// Auto-configure on side-effect import
configureZipLoader().catch((e) => console.warn('[Live2D] ZipLoader config failed', e));

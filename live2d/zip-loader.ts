import JSZip from "jszip";
import type { ModelSettings } from "pixi-live2d-display/cubism4";
import { Cubism4ModelSettings, ZipLoader } from "pixi-live2d-display/cubism4";

// Configure the zip reader to use JSZip
ZipLoader.zipReader = (data: Blob) => JSZip.loadAsync(data);

const defaultCreateSettings = ZipLoader.createSettings;

// Override createSettings to handle ZIPs without a model3.json
ZipLoader.createSettings = async (reader: JSZip) => {
  const filePaths = Object.keys(reader.files);

  if (!filePaths.find((file) => isSettingsFile(file))) {
    return createFakeSettings(filePaths);
  }

  return defaultCreateSettings(reader);
};

export function isSettingsFile(file: string): boolean {
  return file.endsWith("model3.json");
}

export function isMocFile(file: string): boolean {
  return file.endsWith(".moc3");
}

export function basename(path: string): string {
  return path.split(/[\\/]/).pop() ?? "";
}

// Synthesizes a settings file if one is not present in the ZIP
function createFakeSettings(files: string[]): ModelSettings {
  const mocFiles = files.filter((file) => isMocFile(file));

  if (mocFiles.length !== 1) {
    const fileList = mocFiles.length
      ? `(${mocFiles.map((f) => `"${f}"`).join(",")})`
      : "";
    throw new Error(
      `Expected exactly one moc file, got ${mocFiles.length} ${fileList}`,
    );
  }

  const mocFile = mocFiles[0];
  const modelName = basename(mocFile).replace(/\.moc3?/, "");

  const textures = files.filter((f) => f.endsWith(".png"));
  if (!textures.length) {
    throw new Error("Textures not found");
  }

  const motions = files.filter(
    (f) => f.endsWith(".mtn") || f.endsWith(".motion3.json"),
  );
  const physics = files.find((f) => f.includes("physics"));
  const pose = files.find((f) => f.includes("pose"));

  const settings = new Cubism4ModelSettings({
    url: `${modelName}.model3.json`,
    Version: 3,
    FileReferences: {
      Moc: mocFile,
      Textures: textures,
      Physics: physics,
      Pose: pose,
      Motions: motions.length
        ? {
            "": motions.map((motion) => ({ File: motion })),
          }
        : undefined,
    },
  });

  const settingsWithName = settings as ModelSettings & { name: string };
  settingsWithName.name = modelName;

  return settingsWithName;
}

// Override the rest of the loader methods to use JSZip
ZipLoader.readText = (jsZip: JSZip, path: string) => {
  const file = jsZip.file(path);
  if (!file) {
    throw new Error(`Cannot find file: ${path}`);
  }
  return file.async("text");
};

ZipLoader.getFilePaths = (jsZip: JSZip) => {
  const paths: string[] = [];
  for (const relativePath in jsZip.files) {
    paths.push(relativePath);
  }
  return Promise.resolve(paths);
};

ZipLoader.getFiles = (jsZip: JSZip, paths: string[]) =>
  Promise.all(
    paths.map(async (path) => {
      const fileName = path.slice(path.lastIndexOf("/") + 1);
      const blob = await jsZip.file(path)?.async("blob");
      return new File([blob], fileName);
    }),
  );

import fs from 'fs';
import path from 'path';

const files = process.argv.slice(2);

const realFiles = files.filter(file => {
  try {
    const stats = fs.lstatSync(path.resolve(file));
    return !stats.isSymbolicLink();
  } catch (error) {
    // If the file doesn't exist, we can't check it.
    // Let prettier handle the error.
    return true;
  }
});

if (realFiles.length > 0) {
  process.stdout.write(realFiles.join(' '));
}
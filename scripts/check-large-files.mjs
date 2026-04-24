import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, '..', 'src');

function findLargeFiles(dir, threshold = 500) {
  const results = [];
  
  function scan(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        scan(fullPath);
      } else if (entry.name.endsWith('.mjs')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n').length;
        
        if (lines > threshold) {
          const relativePath = path.relative(path.join(__dirname, '..'), fullPath);
          results.push({ path: relativePath, lines });
        }
      }
    }
  }
  
  scan(dir);
  return results.sort((a, b) => b.lines - a.lines);
}

const largeFiles = findLargeFiles(srcDir);

if (largeFiles.length === 0) {
  console.log('✅ 所有文件都在500行以内');
} else {
  console.log(`📊 发现 ${largeFiles.length} 个超过500行的文件：\n`);
  largeFiles.forEach((file, index) => {
    console.log(`${index + 1}. ${file.path}: ${file.lines} 行`);
  });
}

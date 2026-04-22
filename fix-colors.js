const fs = require('fs');
const path = require('path');

const directoriesToScan = ['src/app', 'src/components'];

const replacements = {
  'text-gray-900': 'text-foreground',
  'text-gray-800': 'text-foreground',
  'text-gray-700': 'text-foreground',
  'text-gray-600': 'text-muted-foreground',
  'text-gray-500': 'text-muted-foreground',
  'text-slate-900': 'text-foreground',
  'text-slate-800': 'text-foreground',
  'text-slate-700': 'text-foreground',
  'text-slate-600': 'text-muted-foreground',
  'text-slate-500': 'text-muted-foreground',
  'text-indigo-950': 'text-indigo-100',
  'text-indigo-900': 'text-indigo-200',
  'text-indigo-800': 'text-indigo-300',
  'text-indigo-700': 'text-indigo-300',
  'text-indigo-600': 'text-indigo-400',
  'bg-white': 'bg-card',
  'bg-gray-50': 'bg-muted',
  'bg-gray-100': 'bg-muted',
  'bg-slate-50': 'bg-muted',
  'bg-slate-100': 'bg-muted',
  'border-gray-200': 'border-border',
  'border-gray-100': 'border-border',
  'border-slate-200': 'border-border',
  'border-slate-100': 'border-border',
  'bg-indigo-50/30': 'bg-indigo-500/10',
  'bg-indigo-50': 'bg-indigo-500/10',
  'bg-indigo-100': 'bg-indigo-500/20',
  'border-indigo-100': 'border-indigo-500/20',
  'border-indigo-200': 'border-indigo-500/30',
  'border-indigo-500': 'border-indigo-500/50',
};

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else if (dirPath.endsWith('.tsx') || dirPath.endsWith('.ts')) {
      callback(path.join(dirPath));
    }
  });
}

let modifiedFiles = 0;

directoriesToScan.forEach(dir => {
  if (fs.existsSync(dir)) {
    walkDir(dir, function(filePath) {
      let content = fs.readFileSync(filePath, 'utf8');
      let newContent = content;
      
      // We use word boundaries to avoid replacing parts of other classes
      for (const [oldClass, newClass] of Object.entries(replacements)) {
        // Special regex to replace the exact class
        const regex = new RegExp(`\\b${oldClass.replace(/\//g, '\\/')}\\b`, 'g');
        newContent = newContent.replace(regex, newClass);
      }
      
      if (newContent !== content) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`Modified: ${filePath}`);
        modifiedFiles++;
      }
    });
  }
});

console.log(`Finished. Modified ${modifiedFiles} files.`);

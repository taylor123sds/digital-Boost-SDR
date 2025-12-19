const fs = require('fs');
const path = require('path');

// Regex to match most emojis and special characters
const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{1F100}-\u{1F1FF}]|[\u{1F200}-\u{1F2FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F700}-\u{1F77F}]|[\u{1F780}-\u{1F7FF}]|[\u{1F800}-\u{1F8FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{2300}-\u{23FF}]|[\u{2B50}]|[\u{200D}]|[\u{FE0F}]|[\u{25A0}-\u{25FF}]|[\u{2190}-\u{21FF}]/gu;

function walkDir(dir, callback) {
  try {
    fs.readdirSync(dir).forEach(f => {
      let dirPath = path.join(dir, f);
      let isDirectory = fs.statSync(dirPath).isDirectory();
      isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
  } catch (e) {
    // Skip directories we can't read
  }
}

let cleaned = 0;
let total = 0;

['src', 'scripts'].forEach(baseDir => {
  if (fs.existsSync(baseDir)) {
    walkDir(baseDir, (filePath) => {
      if (filePath.endsWith('.js')) {
        total++;
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const newContent = content.replace(emojiRegex, '');
          if (content !== newContent) {
            fs.writeFileSync(filePath, newContent);
            cleaned++;
            console.log('Cleaned:', filePath);
          }
        } catch (e) {
          console.log('Error processing:', filePath, e.message);
        }
      }
    });
  }
});

console.log('\n=== SUMMARY ===');
console.log('Total JS files:', total);
console.log('Files cleaned:', cleaned);

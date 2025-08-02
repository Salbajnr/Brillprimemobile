
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Function to recursively find all .md files
function findMarkdownFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip node_modules and other unnecessary directories
      if (!['node_modules', '.git', 'dist', '.config'].includes(file)) {
        findMarkdownFiles(filePath, fileList);
      }
    } else if (file.endsWith('.md')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Function to combine all markdown files
function combineMarkdownFiles() {
  const projectRoot = process.cwd();
  const markdownFiles = findMarkdownFiles(projectRoot);
  
  let combinedContent = '# Brillprime Documentation Package\n\n';
  combinedContent += `Generated on: ${new Date().toISOString()}\n\n`;
  combinedContent += '---\n\n';
  
  // Add table of contents
  combinedContent += '## Table of Contents\n\n';
  markdownFiles.forEach((file, index) => {
    const relativePath = path.relative(projectRoot, file);
    const fileName = path.basename(file, '.md');
    combinedContent += `${index + 1}. [${fileName}](#${fileName.toLowerCase().replace(/[^a-z0-9]/g, '-')})\n`;
  });
  combinedContent += '\n---\n\n';
  
  // Add each file's content
  markdownFiles.forEach(file => {
    const relativePath = path.relative(projectRoot, file);
    const fileName = path.basename(file, '.md');
    const content = fs.readFileSync(file, 'utf8');
    
    combinedContent += `## ${fileName}\n\n`;
    combinedContent += `**File:** \`${relativePath}\`\n\n`;
    combinedContent += content;
    combinedContent += '\n\n---\n\n';
  });
  
  // Write combined file
  const outputFile = path.join(projectRoot, 'COMBINED_DOCUMENTATION.md');
  fs.writeFileSync(outputFile, combinedContent);
  
  console.log(`✅ Combined ${markdownFiles.length} markdown files into: ${outputFile}`);
  console.log('\nFiles included:');
  markdownFiles.forEach(file => {
    const relativePath = path.relative(projectRoot, file);
    console.log(`  - ${relativePath}`);
  });
}

// Run the script
combineMarkdownFiles();

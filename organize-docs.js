
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
      if (!['node_modules', '.git', 'dist', '.config', 'docs'].includes(file)) {
        findMarkdownFiles(filePath, fileList);
      }
    } else if (file.endsWith('.md')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Function to clean up temporary files
function cleanupTempFiles() {
  const projectRoot = process.cwd();
  const tempFiles = [
    'ts_errors.txt',
    'tsc_errors.log',
    'typescript_errors.log',
    'typescript_errors_vendor.log',
    'combine-docs.js'
  ];
  
  let cleanedCount = 0;
  
  tempFiles.forEach(file => {
    const filePath = path.join(projectRoot, file);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️  Removed: ${file}`);
      cleanedCount++;
    }
  });
  
  // Clean up attached_assets folder
  const attachedAssetsDir = path.join(projectRoot, 'attached_assets');
  if (fs.existsSync(attachedAssetsDir)) {
    const files = fs.readdirSync(attachedAssetsDir);
    files.forEach(file => {
      const filePath = path.join(attachedAssetsDir, file);
      fs.unlinkSync(filePath);
    });
    fs.rmdirSync(attachedAssetsDir);
    console.log(`🗑️  Removed: attached_assets/ folder and ${files.length} files`);
    cleanedCount += files.length + 1;
  }
  
  return cleanedCount;
}

// Function to organize markdown files
function organizeMarkdownFiles() {
  const projectRoot = process.cwd();
  const docsDir = path.join(projectRoot, 'docs');
  
  // Create docs directory if it doesn't exist
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir);
    console.log('📁 Created docs/ directory');
  }
  
  // Find all markdown files
  const markdownFiles = findMarkdownFiles(projectRoot);
  let movedCount = 0;
  
  markdownFiles.forEach(file => {
    const fileName = path.basename(file);
    const targetPath = path.join(docsDir, fileName);
    
    // Skip if file is already in docs directory
    if (file.includes('/docs/')) {
      return;
    }
    
    // Move file to docs directory
    fs.copyFileSync(file, targetPath);
    fs.unlinkSync(file);
    
    const relativePath = path.relative(projectRoot, file);
    console.log(`📄 Moved: ${relativePath} → docs/${fileName}`);
    movedCount++;
  });
  
  return movedCount;
}

// Function to create a combined documentation file
function createCombinedDocs() {
  const projectRoot = process.cwd();
  const docsDir = path.join(projectRoot, 'docs');
  
  if (!fs.existsSync(docsDir)) {
    console.log('❌ No docs directory found');
    return;
  }
  
  const files = fs.readdirSync(docsDir).filter(file => file.endsWith('.md'));
  
  let combinedContent = '# Brillprime Complete Documentation\n\n';
  combinedContent += `Generated on: ${new Date().toISOString()}\n\n`;
  combinedContent += '---\n\n';
  
  // Add table of contents
  combinedContent += '## Table of Contents\n\n';
  files.forEach((file, index) => {
    const fileName = path.basename(file, '.md');
    combinedContent += `${index + 1}. [${fileName}](#${fileName.toLowerCase().replace(/[^a-z0-9]/g, '-')})\n`;
  });
  combinedContent += '\n---\n\n';
  
  // Add each file's content
  files.forEach(file => {
    const fileName = path.basename(file, '.md');
    const filePath = path.join(docsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    combinedContent += `## ${fileName}\n\n`;
    combinedContent += `**File:** \`docs/${file}\`\n\n`;
    combinedContent += content;
    combinedContent += '\n\n---\n\n';
  });
  
  // Write combined file
  const outputFile = path.join(docsDir, 'COMPLETE_DOCUMENTATION.md');
  fs.writeFileSync(outputFile, combinedContent);
  
  console.log(`📋 Created combined documentation: docs/COMPLETE_DOCUMENTATION.md`);
  console.log(`   Includes ${files.length} markdown files`);
}

// Main function
function main() {
  console.log('🚀 Starting codebase organization...\n');
  
  // Step 1: Move markdown files to docs folder
  console.log('📁 Organizing markdown files...');
  const movedCount = organizeMarkdownFiles();
  
  // Step 2: Clean up temporary files
  console.log('\n🧹 Cleaning up temporary files...');
  const cleanedCount = cleanupTempFiles();
  
  // Step 3: Create combined documentation
  console.log('\n📋 Creating combined documentation...');
  createCombinedDocs();
  
  // Summary
  console.log('\n✅ Organization complete!');
  console.log(`   📄 Moved ${movedCount} markdown files to docs/`);
  console.log(`   🗑️  Cleaned ${cleanedCount} temporary files`);
  console.log('   📋 Created combined documentation file');
  console.log('\n📁 Your documentation is now organized in the docs/ folder');
}

// Run the script
main();

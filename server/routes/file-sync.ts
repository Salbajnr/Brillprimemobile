import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import crypto from 'crypto';
import { auth } from '../middleware/auth';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = 'uploads/';
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error as Error, uploadDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow all file types for now, but can be restricted
    cb(null, true);
  }
});

interface FileInfo {
  id: string;
  name: string;
  path: string;
  size: number;
  type: string;
  lastModified: number;
  checksum: string;
  url: string;
}

// Calculate file checksum
async function calculateChecksum(filePath: string): Promise<string> {
  try {
    const fileBuffer = await fs.readFile(filePath);
    return crypto.createHash('md5').update(fileBuffer).digest('hex');
  } catch (error) {
    console.error('Error calculating checksum:', error);
    return '';
  }
}

// Get file info
async function getFileInfo(filePath: string, fileName: string): Promise<FileInfo | null> {
  try {
    const stats = await fs.stat(filePath);
    const checksum = await calculateChecksum(filePath);
    
    return {
      id: crypto.createHash('md5').update(filePath + stats.mtime.getTime()).digest('hex'),
      name: fileName,
      path: filePath,
      size: stats.size,
      type: path.extname(fileName).toLowerCase(),
      lastModified: stats.mtime.getTime(),
      checksum,
      url: `/api/files/download/${crypto.createHash('md5').update(filePath).digest('hex')}`
    };
  } catch (error) {
    console.error('Error getting file info:', error);
    return null;
  }
}

/**
 * @route GET /api/files/list
 * @desc Get list of files available for sync
 * @access Private
 */
router.get('/list', auth, async (req, res) => {
  try {
    const { directory = 'uploads/' } = req.query;
    const targetDir = directory as string;
    
    // Ensure directory exists
    try {
      await fs.access(targetDir);
    } catch (error) {
      return res.json({
        success: true,
        data: { files: [] },
        message: 'Directory does not exist'
      });
    }

    // Read directory contents
    const files = await fs.readdir(targetDir);
    const fileInfoPromises = files
      .filter(file => !file.startsWith('.')) // Skip hidden files
      .map(async (file) => {
        const filePath = path.join(targetDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.isFile()) {
          return getFileInfo(filePath, file);
        }
        return null;
      });

    const fileInfos = (await Promise.all(fileInfoPromises))
      .filter(info => info !== null) as FileInfo[];

    res.json({
      success: true,
      data: {
        files: fileInfos,
        total: fileInfos.length,
        directory: targetDir
      }
    });

  } catch (error: any) {
    console.error('Error listing files:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list files',
      message: error.message
    });
  }
});

/**
 * @route GET /api/files/download/:fileId
 * @desc Download file by ID
 * @access Private
 */
router.get('/download/:fileId', auth, async (req, res) => {
  try {
    const { fileId } = req.params;
    
    // For security, we'll need to maintain a mapping of fileId to actual file paths
    // For now, we'll use a simple approach but this should be stored in database
    const filePath = req.query.path as string;
    
    if (!filePath) {
      return res.status(400).json({
        success: false,
        error: 'File path is required'
      });
    }

    // Verify file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    // Get file info
    const stats = await fs.stat(filePath);
    const fileName = path.basename(filePath);
    
    // Set appropriate headers
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', stats.size);

    // Stream file to response
    const fileStream = createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error: any) {
    console.error('Error downloading file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download file',
      message: error.message
    });
  }
});

/**
 * @route POST /api/files/upload
 * @desc Upload file from native app
 * @access Private
 */
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided'
      });
    }

    const fileInfo = await getFileInfo(req.file.path, req.file.originalname);
    
    if (!fileInfo) {
      return res.status(500).json({
        success: false,
        error: 'Failed to process uploaded file'
      });
    }

    // Here you might want to store file info in database
    // For now, we'll just return the file info

    res.json({
      success: true,
      data: { file: fileInfo },
      message: 'File uploaded successfully'
    });

  } catch (error: any) {
    console.error('Error uploading file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload file',
      message: error.message
    });
  }
});

/**
 * @route GET /api/files/metadata/:fileId
 * @desc Get file metadata
 * @access Private
 */
router.get('/metadata/:fileId', auth, async (req, res) => {
  try {
    const { fileId } = req.params;
    const filePath = req.query.path as string;
    
    if (!filePath) {
      return res.status(400).json({
        success: false,
        error: 'File path is required'
      });
    }

    const fileName = path.basename(filePath);
    const fileInfo = await getFileInfo(filePath, fileName);
    
    if (!fileInfo) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    res.json({
      success: true,
      data: { file: fileInfo }
    });

  } catch (error: any) {
    console.error('Error getting file metadata:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get file metadata',
      message: error.message
    });
  }
});

/**
 * @route GET /api/files/search
 * @desc Search files
 * @access Private
 */
router.get('/search', auth, async (req, res) => {
  try {
    const { q: query, type, dateFrom, dateTo, directory = 'uploads/' } = req.query;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    const targetDir = directory as string;
    
    // Read directory contents
    const files = await fs.readdir(targetDir);
    const fileInfoPromises = files
      .filter(file => {
        // Filter by name
        const matchesName = file.toLowerCase().includes((query as string).toLowerCase());
        
        // Filter by type
        const matchesType = type ? path.extname(file).toLowerCase() === (type as string).toLowerCase() : true;
        
        return matchesName && matchesType && !file.startsWith('.');
      })
      .map(async (file) => {
        const filePath = path.join(targetDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.isFile()) {
          // Filter by date if provided
          if (dateFrom || dateTo) {
            const fileDate = stats.mtime;
            const fromDate = dateFrom ? new Date(dateFrom as string) : null;
            const toDate = dateTo ? new Date(dateTo as string) : null;
            
            if (fromDate && fileDate < fromDate) return null;
            if (toDate && fileDate > toDate) return null;
          }
          
          return getFileInfo(filePath, file);
        }
        return null;
      });

    const fileInfos = (await Promise.all(fileInfoPromises))
      .filter(info => info !== null) as FileInfo[];

    res.json({
      success: true,
      data: {
        files: fileInfos,
        total: fileInfos.length,
        query,
        filters: { type, dateFrom, dateTo }
      }
    });

  } catch (error: any) {
    console.error('Error searching files:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search files',
      message: error.message
    });
  }
});

/**
 * @route DELETE /api/files/:fileId
 * @desc Delete file
 * @access Private
 */
router.delete('/:fileId', auth, async (req, res) => {
  try {
    const { fileId } = req.params;
    const filePath = req.query.path as string;
    
    if (!filePath) {
      return res.status(400).json({
        success: false,
        error: 'File path is required'
      });
    }

    // Verify file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    // Delete file
    await fs.unlink(filePath);

    res.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error: any) {
    console.error('Error deleting file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete file',
      message: error.message
    });
  }
});

/**
 * @route GET /api/files/sync/status
 * @desc Get sync status information
 * @access Private
 */
router.get('/sync/status', auth, async (req, res) => {
  try {
    // This would typically check sync status from database
    // For now, return basic status
    
    const uploadDir = 'uploads/';
    let fileCount = 0;
    let totalSize = 0;
    
    try {
      const files = await fs.readdir(uploadDir);
      fileCount = files.length;
      
      for (const file of files) {
        const filePath = path.join(uploadDir, file);
        const stats = await fs.stat(filePath);
        if (stats.isFile()) {
          totalSize += stats.size;
        }
      }
    } catch (error) {
      // Directory doesn't exist or other error
    }

    res.json({
      success: true,
      data: {
        status: 'online',
        fileCount,
        totalSize,
        lastUpdate: Date.now(),
        syncEnabled: true
      }
    });

  } catch (error: any) {
    console.error('Error getting sync status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sync status',
      message: error.message
    });
  }
});

export default router;
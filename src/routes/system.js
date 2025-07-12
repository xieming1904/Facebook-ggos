const express = require('express');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const unzipper = require('unzipper');
const mongoose = require('mongoose');

const router = express.Router();

// 配置文件上传
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const backupDir = 'backups/temp/';
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      cb(null, backupDir);
    },
    filename: (req, file, cb) => {
      cb(null, `restore-${Date.now()}.zip`);
    }
  }),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  }
});

// 系统备份
router.post('/backup', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const backupDir = 'backups/';
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `backup-${timestamp}.zip`;
    const backupPath = path.join(backupDir, backupFileName);

    // 创建压缩包
    const output = fs.createWriteStream(backupPath);
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    output.on('close', () => {
      // 发送文件给客户端
      res.download(backupPath, backupFileName, (err) => {
        if (err) {
          console.error('Download error:', err);
        }
        // 下载完成后删除临时文件
        setTimeout(() => {
          if (fs.existsSync(backupPath)) {
            fs.unlinkSync(backupPath);
          }
        }, 5000);
      });
    });

    archive.on('error', (err) => {
      console.error('Archive error:', err);
      res.status(500).json({ error: 'Backup failed' });
    });

    archive.pipe(output);

    // 备份数据库
    const collections = await mongoose.connection.db.listCollections().toArray();
    for (const collection of collections) {
      const collectionName = collection.name;
      const data = await mongoose.connection.db.collection(collectionName).find({}).toArray();
      archive.append(JSON.stringify(data, null, 2), { name: `database/${collectionName}.json` });
    }

    // 备份配置文件
    const configFiles = ['.env', 'package.json'];
    for (const file of configFiles) {
      if (fs.existsSync(file)) {
        archive.file(file, { name: `config/${file}` });
      }
    }

    // 备份上传文件
    if (fs.existsSync('uploads/')) {
      archive.directory('uploads/', 'uploads/');
    }

    // 备份日志文件
    if (fs.existsSync('logs/')) {
      archive.directory('logs/', 'logs/');
    }

    // 添加备份信息
    const backupInfo = {
      timestamp: new Date().toISOString(),
      version: require('../../package.json').version,
      nodeVersion: process.version,
      platform: process.platform,
      createdBy: req.user.username
    };
    archive.append(JSON.stringify(backupInfo, null, 2), { name: 'backup-info.json' });

    archive.finalize();

  } catch (error) {
    console.error('Backup error:', error);
    res.status(500).json({ error: 'Backup failed' });
  }
});

// 系统恢复
router.post('/restore', auth, upload.single('backup'), async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No backup file provided' });
    }

    const backupFile = req.file.path;
    const extractPath = 'backups/extract/';

    // 清理提取目录
    if (fs.existsSync(extractPath)) {
      fs.rmSync(extractPath, { recursive: true, force: true });
    }
    fs.mkdirSync(extractPath, { recursive: true });

    // 解压备份文件
    await new Promise((resolve, reject) => {
      fs.createReadStream(backupFile)
        .pipe(unzipper.Extract({ path: extractPath }))
        .on('close', resolve)
        .on('error', reject);
    });

    // 验证备份文件
    const backupInfoPath = path.join(extractPath, 'backup-info.json');
    if (!fs.existsSync(backupInfoPath)) {
      throw new Error('Invalid backup file: missing backup info');
    }

    const backupInfo = JSON.parse(fs.readFileSync(backupInfoPath, 'utf8'));
    console.log('Restoring backup:', backupInfo);

    // 恢复数据库
    const databasePath = path.join(extractPath, 'database');
    if (fs.existsSync(databasePath)) {
      const collectionFiles = fs.readdirSync(databasePath);
      
      for (const file of collectionFiles) {
        if (file.endsWith('.json')) {
          const collectionName = file.replace('.json', '');
          const filePath = path.join(databasePath, file);
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          
          // 清空现有集合
          await mongoose.connection.db.collection(collectionName).deleteMany({});
          
          // 插入备份数据
          if (data.length > 0) {
            await mongoose.connection.db.collection(collectionName).insertMany(data);
          }
          
          console.log(`Restored collection: ${collectionName} (${data.length} documents)`);
        }
      }
    }

    // 恢复上传文件
    const uploadsPath = path.join(extractPath, 'uploads');
    if (fs.existsSync(uploadsPath)) {
      if (fs.existsSync('uploads/')) {
        fs.rmSync('uploads/', { recursive: true, force: true });
      }
      fs.cpSync(uploadsPath, 'uploads/', { recursive: true });
      console.log('Restored uploads directory');
    }

    // 清理临时文件
    fs.rmSync(backupFile, { force: true });
    fs.rmSync(extractPath, { recursive: true, force: true });

    res.json({
      message: 'System restored successfully',
      backupInfo
    });

  } catch (error) {
    console.error('Restore error:', error);
    res.status(500).json({ error: 'Restore failed: ' + error.message });
  }
});

// 系统信息
router.get('/info', auth, async (req, res) => {
  try {
    const dbStats = await mongoose.connection.db.stats();
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    const systemInfo = {
      database: {
        status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        size: Math.round(dbStats.dataSize / 1024 / 1024 * 100) / 100 + ' MB',
        collections: collections.length,
        indexes: dbStats.indexes
      },
      server: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: Math.floor(process.uptime()),
        pid: process.pid
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
      },
      files: {
        uploads: getDirectorySize('uploads/'),
        logs: getDirectorySize('logs/'),
        backups: getDirectorySize('backups/')
      }
    };

    res.json({ systemInfo });
  } catch (error) {
    console.error('Get system info error:', error);
    res.status(500).json({ error: 'Failed to get system info' });
  }
});

// 清理系统缓存
router.post('/cleanup', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    let cleanedFiles = 0;
    let freedSpace = 0;

    // 清理临时文件
    const tempDirs = ['backups/temp/', 'uploads/temp/', 'logs/temp/'];
    for (const dir of tempDirs) {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stats = fs.statSync(filePath);
          freedSpace += stats.size;
          fs.unlinkSync(filePath);
          cleanedFiles++;
        }
      }
    }

    // 清理过期日志
    const logsDir = 'logs/';
    if (fs.existsSync(logsDir)) {
      const files = fs.readdirSync(logsDir);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      for (const file of files) {
        const filePath = path.join(logsDir, file);
        const stats = fs.statSync(filePath);
        if (stats.mtime < thirtyDaysAgo) {
          freedSpace += stats.size;
          fs.unlinkSync(filePath);
          cleanedFiles++;
        }
      }
    }

    res.json({
      message: 'System cleanup completed',
      cleanedFiles,
      freedSpace: Math.round(freedSpace / 1024 / 1024 * 100) / 100 + ' MB'
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: 'Cleanup failed' });
  }
});

// 获取目录大小的辅助函数
function getDirectorySize(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return '0 MB';
  }

  let size = 0;
  const files = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const file of files) {
    const filePath = path.join(dirPath, file.name);
    if (file.isDirectory()) {
      size += getDirectorySizeInBytes(filePath);
    } else {
      size += fs.statSync(filePath).size;
    }
  }

  return Math.round(size / 1024 / 1024 * 100) / 100 + ' MB';
}

function getDirectorySizeInBytes(dirPath) {
  let size = 0;
  try {
    const files = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const file of files) {
      const filePath = path.join(dirPath, file.name);
      if (file.isDirectory()) {
        size += getDirectorySizeInBytes(filePath);
      } else {
        size += fs.statSync(filePath).size;
      }
    }
  } catch (error) {
    console.error('Error reading directory:', error);
  }
  return size;
}

module.exports = router;
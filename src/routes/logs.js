const express = require('express');
const path = require('path');
const fs = require('fs');
const readline = require('readline');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// 获取日志文件列表
router.get('/files', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const logsDir = 'logs';
    if (!fs.existsSync(logsDir)) {
      return res.json({ files: [] });
    }

    const files = fs.readdirSync(logsDir).map(filename => {
      const filePath = path.join(logsDir, filename);
      const stats = fs.statSync(filePath);
      return {
        name: filename,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        sizeFormatted: formatBytes(stats.size)
      };
    }).sort((a, b) => b.modified - a.modified);

    res.json({ files });
  } catch (error) {
    logger.error('Get log files error:', error);
    res.status(500).json({ error: 'Failed to get log files' });
  }
});

// 读取日志文件内容
router.get('/content/:filename', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const filename = req.params.filename;
    const filePath = path.join('logs', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Log file not found' });
    }

    const { page = 1, limit = 100, level, search } = req.query;
    const offset = (page - 1) * limit;

    const logs = await readLogFile(filePath, {
      offset: parseInt(offset),
      limit: parseInt(limit),
      level,
      search
    });

    res.json(logs);
  } catch (error) {
    logger.error('Read log file error:', error);
    res.status(500).json({ error: 'Failed to read log file' });
  }
});

// 实时日志流
router.get('/stream/:filename', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const filename = req.params.filename;
    const filePath = path.join('logs', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Log file not found' });
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    const watcher = fs.watch(filePath, (eventType) => {
      if (eventType === 'change') {
        // 读取文件最后几行
        readLastLines(filePath, 10).then(lines => {
          res.write(`data: ${JSON.stringify({ lines })}\n\n`);
        });
      }
    });

    req.on('close', () => {
      watcher.close();
    });

  } catch (error) {
    logger.error('Log stream error:', error);
    res.status(500).json({ error: 'Failed to stream log file' });
  }
});

// 删除日志文件
router.delete('/files/:filename', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const filename = req.params.filename;
    const filePath = path.join('logs', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Log file not found' });
    }

    fs.unlinkSync(filePath);
    logger.logSystemEvent('log_file_deleted', { filename, userId: req.user.userId });
    
    res.json({ message: 'Log file deleted successfully' });
  } catch (error) {
    logger.error('Delete log file error:', error);
    res.status(500).json({ error: 'Failed to delete log file' });
  }
});

// 清空日志文件
router.post('/clear/:filename', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const filename = req.params.filename;
    const filePath = path.join('logs', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Log file not found' });
    }

    fs.writeFileSync(filePath, '');
    logger.logSystemEvent('log_file_cleared', { filename, userId: req.user.userId });
    
    res.json({ message: 'Log file cleared successfully' });
  } catch (error) {
    logger.error('Clear log file error:', error);
    res.status(500).json({ error: 'Failed to clear log file' });
  }
});

// 下载日志文件
router.get('/download/:filename', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const filename = req.params.filename;
    const filePath = path.join('logs', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Log file not found' });
    }

    logger.logSystemEvent('log_file_downloaded', { filename, userId: req.user.userId });
    res.download(filePath, filename);
  } catch (error) {
    logger.error('Download log file error:', error);
    res.status(500).json({ error: 'Failed to download log file' });
  }
});

// 获取系统日志统计
router.get('/stats', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const stats = await getLogStats();
    res.json({ stats });
  } catch (error) {
    logger.error('Get log stats error:', error);
    res.status(500).json({ error: 'Failed to get log stats' });
  }
});

// 辅助函数：读取日志文件
async function readLogFile(filePath, options = {}) {
  const { offset = 0, limit = 100, level, search } = options;
  const lines = [];
  let lineCount = 0;
  let totalLines = 0;

  return new Promise((resolve, reject) => {
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    rl.on('line', (line) => {
      totalLines++;
      
      if (line.trim() === '') return;

      try {
        const logEntry = JSON.parse(line);
        
        // 过滤条件
        if (level && logEntry.level !== level) return;
        if (search && !JSON.stringify(logEntry).toLowerCase().includes(search.toLowerCase())) return;

        if (lineCount >= offset && lines.length < limit) {
          lines.push(logEntry);
        }
        lineCount++;
      } catch (err) {
        // 非JSON格式的日志行
        if (lineCount >= offset && lines.length < limit) {
          lines.push({
            timestamp: new Date().toISOString(),
            level: 'info',
            message: line
          });
        }
        lineCount++;
      }
    });

    rl.on('close', () => {
      resolve({
        logs: lines,
        totalLines: lineCount,
        page: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(lineCount / limit)
      });
    });

    rl.on('error', reject);
  });
}

// 辅助函数：读取文件最后几行
async function readLastLines(filePath, lines) {
  return new Promise((resolve, reject) => {
    const buffer = [];
    const stream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: stream,
      crlfDelay: Infinity
    });

    rl.on('line', (line) => {
      buffer.push(line);
      if (buffer.length > lines) {
        buffer.shift();
      }
    });

    rl.on('close', () => {
      resolve(buffer);
    });

    rl.on('error', reject);
  });
}

// 辅助函数：格式化字节数
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// 辅助函数：获取日志统计
async function getLogStats() {
  const stats = {
    files: 0,
    totalSize: 0,
    logCounts: {
      error: 0,
      warn: 0,
      info: 0,
      debug: 0
    }
  };

  const logsDir = 'logs';
  if (!fs.existsSync(logsDir)) {
    return stats;
  }

  const files = fs.readdirSync(logsDir);
  stats.files = files.length;

  for (const file of files) {
    const filePath = path.join(logsDir, file);
    const fileStats = fs.statSync(filePath);
    stats.totalSize += fileStats.size;

    // 统计日志级别
    if (file.endsWith('.log')) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              const logEntry = JSON.parse(line);
              if (logEntry.level && stats.logCounts[logEntry.level] !== undefined) {
                stats.logCounts[logEntry.level]++;
              }
            } catch (err) {
              // 忽略无法解析的行
            }
          }
        }
      } catch (err) {
        // 忽略读取错误
      }
    }
  }

  stats.totalSizeFormatted = formatBytes(stats.totalSize);
  return stats;
}

module.exports = router;
const express = require('express');
const LandingPage = require('../models/LandingPage');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/screenshots/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
    }
  }
});

// 获取所有落地页
router.get('/', auth, async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? {} : { createdBy: req.user.userId };
    const { type, template, page = 1, limit = 10 } = req.query;
    
    // 构建查询条件
    if (type) query.type = type;
    if (template) query.template = template;
    
    const skip = (page - 1) * limit;
    
    const landingPages = await LandingPage.find(query)
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await LandingPage.countDocuments(query);
    
    res.json({
      landingPages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Get landing pages error:', error);
    res.status(500).json({ error: 'Failed to get landing pages' });
  }
});

// 获取单个落地页详情
router.get('/:id', auth, async (req, res) => {
  try {
    const landingPage = await LandingPage.findById(req.params.id)
      .populate('createdBy', 'username');
    
    if (!landingPage) {
      return res.status(404).json({ error: 'Landing page not found' });
    }
    
    // 检查权限
    if (req.user.role !== 'admin' && landingPage.createdBy._id.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json({ landingPage });
    
  } catch (error) {
    console.error('Get landing page error:', error);
    res.status(500).json({ error: 'Failed to get landing page' });
  }
});

// 创建新落地页
router.post('/', auth, async (req, res) => {
  try {
    const {
      name,
      type,
      content,
      seo,
      template
    } = req.body;
    
    // 验证必需字段
    if (!name || !type || !content || !content.html) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // 创建新落地页
    const landingPage = new LandingPage({
      name,
      type,
      content: {
        html: content.html,
        css: content.css || '',
        js: content.js || ''
      },
      seo: seo || {},
      template: template || 'custom',
      createdBy: req.user.userId
    });
    
    await landingPage.save();
    
    const populatedLandingPage = await LandingPage.findById(landingPage._id)
      .populate('createdBy', 'username');
    
    res.status(201).json({
      message: 'Landing page created successfully',
      landingPage: populatedLandingPage
    });
    
  } catch (error) {
    console.error('Create landing page error:', error);
    res.status(500).json({ error: 'Failed to create landing page' });
  }
});

// 更新落地页
router.put('/:id', auth, async (req, res) => {
  try {
    const landingPage = await LandingPage.findById(req.params.id);
    
    if (!landingPage) {
      return res.status(404).json({ error: 'Landing page not found' });
    }
    
    // 检查权限
    if (req.user.role !== 'admin' && landingPage.createdBy.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const {
      name,
      type,
      content,
      seo,
      template,
      isActive
    } = req.body;
    
    // 更新字段
    if (name !== undefined) landingPage.name = name;
    if (type !== undefined) landingPage.type = type;
    if (content !== undefined) {
      landingPage.content = {
        html: content.html || landingPage.content.html,
        css: content.css !== undefined ? content.css : landingPage.content.css,
        js: content.js !== undefined ? content.js : landingPage.content.js
      };
    }
    if (seo !== undefined) landingPage.seo = { ...landingPage.seo, ...seo };
    if (template !== undefined) landingPage.template = template;
    if (isActive !== undefined) landingPage.isActive = isActive;
    
    await landingPage.save();
    
    const updatedLandingPage = await LandingPage.findById(landingPage._id)
      .populate('createdBy', 'username');
    
    res.json({
      message: 'Landing page updated successfully',
      landingPage: updatedLandingPage
    });
    
  } catch (error) {
    console.error('Update landing page error:', error);
    res.status(500).json({ error: 'Failed to update landing page' });
  }
});

// 删除落地页
router.delete('/:id', auth, async (req, res) => {
  try {
    const landingPage = await LandingPage.findById(req.params.id);
    
    if (!landingPage) {
      return res.status(404).json({ error: 'Landing page not found' });
    }
    
    // 检查权限
    if (req.user.role !== 'admin' && landingPage.createdBy.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await LandingPage.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Landing page deleted successfully' });
    
  } catch (error) {
    console.error('Delete landing page error:', error);
    res.status(500).json({ error: 'Failed to delete landing page' });
  }
});

// 复制落地页
router.post('/:id/clone', auth, async (req, res) => {
  try {
    const originalPage = await LandingPage.findById(req.params.id);
    
    if (!originalPage) {
      return res.status(404).json({ error: 'Landing page not found' });
    }
    
    // 检查权限
    if (req.user.role !== 'admin' && originalPage.createdBy.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const { name } = req.body;
    
    // 创建副本
    const clonedPage = new LandingPage({
      name: name || `${originalPage.name} - Copy`,
      type: originalPage.type,
      content: {
        html: originalPage.content.html,
        css: originalPage.content.css,
        js: originalPage.content.js
      },
      seo: { ...originalPage.seo },
      template: originalPage.template,
      createdBy: req.user.userId
    });
    
    await clonedPage.save();
    
    const populatedClonedPage = await LandingPage.findById(clonedPage._id)
      .populate('createdBy', 'username');
    
    res.status(201).json({
      message: 'Landing page cloned successfully',
      landingPage: populatedClonedPage
    });
    
  } catch (error) {
    console.error('Clone landing page error:', error);
    res.status(500).json({ error: 'Failed to clone landing page' });
  }
});

// 上传截图
router.post('/:id/screenshot', auth, upload.single('screenshot'), async (req, res) => {
  try {
    const landingPage = await LandingPage.findById(req.params.id);
    
    if (!landingPage) {
      return res.status(404).json({ error: 'Landing page not found' });
    }
    
    // 检查权限
    if (req.user.role !== 'admin' && landingPage.createdBy.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const screenshotUrl = `/uploads/screenshots/${req.file.filename}`;
    
    // 添加截图记录
    landingPage.screenshots.push({
      url: screenshotUrl,
      createdAt: new Date()
    });
    
    await landingPage.save();
    
    res.json({
      message: 'Screenshot uploaded successfully',
      screenshotUrl
    });
    
  } catch (error) {
    console.error('Upload screenshot error:', error);
    res.status(500).json({ error: 'Failed to upload screenshot' });
  }
});

// 获取模板列表
router.get('/templates/list', auth, async (req, res) => {
  try {
    const templates = [
      {
        id: 'news',
        name: 'News Article',
        description: 'Professional news article template',
        preview: '/templates/news-preview.jpg'
      },
      {
        id: 'blog',
        name: 'Blog Post',
        description: 'Modern blog post template',
        preview: '/templates/blog-preview.jpg'
      },
      {
        id: 'shop',
        name: 'E-commerce',
        description: 'Product showcase template',
        preview: '/templates/shop-preview.jpg'
      },
      {
        id: 'corporate',
        name: 'Corporate',
        description: 'Professional corporate template',
        preview: '/templates/corporate-preview.jpg'
      }
    ];
    
    res.json({ templates });
    
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: 'Failed to get templates' });
  }
});

// 获取模板内容
router.get('/templates/:templateId', auth, async (req, res) => {
  try {
    const { templateId } = req.params;
    
    // 这里应该从模板文件中读取内容
    const templates = {
      news: {
        html: `
          <div class="news-container">
            <header class="news-header">
              <h1>Breaking News</h1>
              <div class="news-meta">
                <span class="date">{{DATE}}</span>
                <span class="author">By {{AUTHOR}}</span>
              </div>
            </header>
            <article class="news-content">
              <h2>{{TITLE}}</h2>
              <p>{{CONTENT}}</p>
            </article>
          </div>
        `,
        css: `
          .news-container { max-width: 800px; margin: 0 auto; padding: 20px; }
          .news-header { border-bottom: 2px solid #007bff; padding-bottom: 20px; margin-bottom: 30px; }
          .news-header h1 { color: #007bff; margin: 0; }
          .news-meta { margin-top: 10px; color: #666; }
          .news-content h2 { color: #333; }
          .news-content p { line-height: 1.6; color: #555; }
        `,
        js: `
          // Template JavaScript
          document.addEventListener('DOMContentLoaded', function() {
            console.log('News template loaded');
          });
        `
      },
      blog: {
        html: `
          <div class="blog-container">
            <article class="blog-post">
              <h1>{{TITLE}}</h1>
              <div class="blog-meta">
                <span>{{DATE}}</span>
              </div>
              <div class="blog-content">
                {{CONTENT}}
              </div>
            </article>
          </div>
        `,
        css: `
          .blog-container { max-width: 700px; margin: 0 auto; padding: 30px; }
          .blog-post h1 { font-size: 2.5em; margin-bottom: 20px; }
          .blog-meta { color: #888; margin-bottom: 30px; }
          .blog-content { line-height: 1.7; }
        `,
        js: `
          document.addEventListener('DOMContentLoaded', function() {
            console.log('Blog template loaded');
          });
        `
      }
    };
    
    const template = templates[templateId];
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.json({ template });
    
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ error: 'Failed to get template' });
  }
});

module.exports = router;
const express = require('express');
const Domain = require('../models/Domain');
const LandingPage = require('../models/LandingPage');
const auth = require('../middleware/auth');

const router = express.Router();

// 获取所有域名
router.get('/', auth, async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? {} : { createdBy: req.user.userId };
    
    const domains = await Domain.find(query)
      .populate('cloakPage', 'name type')
      .populate('mainPage', 'name type')
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 });
    
    res.json({ domains });
    
  } catch (error) {
    console.error('Get domains error:', error);
    res.status(500).json({ error: 'Failed to get domains' });
  }
});

// 获取单个域名详情
router.get('/:id', auth, async (req, res) => {
  try {
    const domain = await Domain.findById(req.params.id)
      .populate('cloakPage')
      .populate('mainPage')
      .populate('createdBy', 'username');
    
    if (!domain) {
      return res.status(404).json({ error: 'Domain not found' });
    }
    
    // 检查权限
    if (req.user.role !== 'admin' && domain.createdBy._id.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json({ domain });
    
  } catch (error) {
    console.error('Get domain error:', error);
    res.status(500).json({ error: 'Failed to get domain' });
  }
});

// 创建新域名
router.post('/', auth, async (req, res) => {
  try {
    const {
      domain,
      sslEnabled,
      redirectUrl,
      cloakEnabled,
      cloakPage,
      mainPage
    } = req.body;
    
    // 检查域名是否已存在
    const existingDomain = await Domain.findOne({ domain });
    if (existingDomain) {
      return res.status(400).json({ error: 'Domain already exists' });
    }
    
    // 验证域名格式
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      return res.status(400).json({ error: 'Invalid domain format' });
    }
    
    // 创建新域名
    const newDomain = new Domain({
      domain,
      sslEnabled: sslEnabled || false,
      redirectUrl,
      cloakEnabled: cloakEnabled !== false,
      cloakPage,
      mainPage,
      createdBy: req.user.userId
    });
    
    await newDomain.save();
    
    const populatedDomain = await Domain.findById(newDomain._id)
      .populate('cloakPage', 'name type')
      .populate('mainPage', 'name type')
      .populate('createdBy', 'username');
    
    res.status(201).json({
      message: 'Domain created successfully',
      domain: populatedDomain
    });
    
  } catch (error) {
    console.error('Create domain error:', error);
    res.status(500).json({ error: 'Failed to create domain' });
  }
});

// 更新域名
router.put('/:id', auth, async (req, res) => {
  try {
    const domain = await Domain.findById(req.params.id);
    
    if (!domain) {
      return res.status(404).json({ error: 'Domain not found' });
    }
    
    // 检查权限
    if (req.user.role !== 'admin' && domain.createdBy.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const {
      isActive,
      sslEnabled,
      redirectUrl,
      cloakEnabled,
      cloakPage,
      mainPage,
      status
    } = req.body;
    
    // 更新域名信息
    if (isActive !== undefined) domain.isActive = isActive;
    if (sslEnabled !== undefined) domain.sslEnabled = sslEnabled;
    if (redirectUrl !== undefined) domain.redirectUrl = redirectUrl;
    if (cloakEnabled !== undefined) domain.cloakEnabled = cloakEnabled;
    if (cloakPage !== undefined) domain.cloakPage = cloakPage;
    if (mainPage !== undefined) domain.mainPage = mainPage;
    if (status !== undefined) domain.status = status;
    
    await domain.save();
    
    const updatedDomain = await Domain.findById(domain._id)
      .populate('cloakPage', 'name type')
      .populate('mainPage', 'name type')
      .populate('createdBy', 'username');
    
    res.json({
      message: 'Domain updated successfully',
      domain: updatedDomain
    });
    
  } catch (error) {
    console.error('Update domain error:', error);
    res.status(500).json({ error: 'Failed to update domain' });
  }
});

// 删除域名
router.delete('/:id', auth, async (req, res) => {
  try {
    const domain = await Domain.findById(req.params.id);
    
    if (!domain) {
      return res.status(404).json({ error: 'Domain not found' });
    }
    
    // 检查权限
    if (req.user.role !== 'admin' && domain.createdBy.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await Domain.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Domain deleted successfully' });
    
  } catch (error) {
    console.error('Delete domain error:', error);
    res.status(500).json({ error: 'Failed to delete domain' });
  }
});

// 检查域名状态
router.post('/:id/check-status', auth, async (req, res) => {
  try {
    const domain = await Domain.findById(req.params.id);
    
    if (!domain) {
      return res.status(404).json({ error: 'Domain not found' });
    }
    
    // 检查权限
    if (req.user.role !== 'admin' && domain.createdBy.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // 这里可以添加实际的域名状态检查逻辑
    // 例如：DNS解析、SSL证书检查、网站可访问性检查等
    
    domain.lastChecked = new Date();
    await domain.save();
    
    res.json({
      message: 'Domain status checked',
      domain: {
        id: domain._id,
        domain: domain.domain,
        status: domain.status,
        lastChecked: domain.lastChecked
      }
    });
    
  } catch (error) {
    console.error('Check domain status error:', error);
    res.status(500).json({ error: 'Failed to check domain status' });
  }
});

// 获取域名统计信息
router.get('/:id/stats', auth, async (req, res) => {
  try {
    const domain = await Domain.findById(req.params.id);
    
    if (!domain) {
      return res.status(404).json({ error: 'Domain not found' });
    }
    
    // 检查权限
    if (req.user.role !== 'admin' && domain.createdBy.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json({
      stats: {
        totalVisits: domain.analytics.totalVisits,
        uniqueVisitors: domain.analytics.uniqueVisitors,
        conversions: domain.analytics.conversions,
        lastChecked: domain.lastChecked
      }
    });
    
  } catch (error) {
    console.error('Get domain stats error:', error);
    res.status(500).json({ error: 'Failed to get domain stats' });
  }
});

module.exports = router;
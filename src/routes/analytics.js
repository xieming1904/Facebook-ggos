const express = require('express');
const Domain = require('../models/Domain');
const LandingPage = require('../models/LandingPage');
const auth = require('../middleware/auth');

const router = express.Router();

// 跟踪页面访问
router.post('/track', async (req, res) => {
  try {
    const {
      pageId,
      domainId,
      loadTime,
      timestamp,
      userAgent,
      referrer,
      screenResolution,
      language
    } = req.body;
    
    // 这里应该将访问数据保存到数据库
    // 为了简化，现在只更新基本统计
    
    if (pageId) {
      await LandingPage.findByIdAndUpdate(pageId, {
        $inc: { 'analytics.views': 1 }
      });
    }
    
    if (domainId) {
      await Domain.findByIdAndUpdate(domainId, {
        $inc: { 'analytics.totalVisits': 1 }
      });
    }
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Track error:', error);
    res.status(500).json({ error: 'Failed to track' });
  }
});

// 跟踪点击事件
router.post('/track-click', async (req, res) => {
  try {
    const {
      pageId,
      domainId,
      element,
      text,
      href,
      timestamp
    } = req.body;
    
    // 这里应该将点击数据保存到数据库
    // 为了简化，现在只更新基本统计
    
    if (pageId) {
      await LandingPage.findByIdAndUpdate(pageId, {
        $inc: { 'analytics.clicks': 1 }
      });
    }
    
    if (domainId) {
      await Domain.findByIdAndUpdate(domainId, {
        $inc: { 'analytics.conversions': 1 }
      });
    }
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Track click error:', error);
    res.status(500).json({ error: 'Failed to track click' });
  }
});

// 获取综合统计
router.get('/dashboard', auth, async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    // 获取用户的域名和页面统计
    const userQuery = req.user.role === 'admin' ? {} : { createdBy: req.user.userId };
    
    const domains = await Domain.find(userQuery);
    const landingPages = await LandingPage.find(userQuery);
    
    // 计算总体统计
    const totalDomains = domains.length;
    const totalPages = landingPages.length;
    const totalVisits = domains.reduce((sum, domain) => sum + domain.analytics.totalVisits, 0);
    const totalClicks = landingPages.reduce((sum, page) => sum + page.analytics.clicks, 0);
    
    // 最近7天的数据（模拟）
    const chartData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      chartData.push({
        date: date.toISOString().split('T')[0],
        visits: Math.floor(Math.random() * 200) + 50,
        clicks: Math.floor(Math.random() * 50) + 10
      });
    }
    
    // 热门域名
    const topDomains = domains
      .sort((a, b) => b.analytics.totalVisits - a.analytics.totalVisits)
      .slice(0, 5)
      .map(domain => ({
        domain: domain.domain,
        visits: domain.analytics.totalVisits,
        status: domain.status
      }));
    
    // 热门页面
    const topPages = landingPages
      .sort((a, b) => b.analytics.views - a.analytics.views)
      .slice(0, 5)
      .map(page => ({
        name: page.name,
        views: page.analytics.views,
        clicks: page.analytics.clicks,
        type: page.type
      }));
    
    res.json({
      summary: {
        totalDomains,
        totalPages,
        totalVisits,
        totalClicks,
        conversionRate: totalVisits > 0 ? ((totalClicks / totalVisits) * 100).toFixed(2) : 0
      },
      chartData,
      topDomains,
      topPages
    });
    
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
});

// 获取域名分析
router.get('/domain/:id', auth, async (req, res) => {
  try {
    const domain = await Domain.findById(req.params.id)
      .populate('mainPage', 'name analytics')
      .populate('cloakPage', 'name analytics');
    
    if (!domain) {
      return res.status(404).json({ error: 'Domain not found' });
    }
    
    // 检查权限
    if (req.user.role !== 'admin' && domain.createdBy.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // 模拟详细分析数据
    const analytics = {
      summary: {
        totalVisits: domain.analytics.totalVisits,
        uniqueVisitors: domain.analytics.uniqueVisitors,
        conversions: domain.analytics.conversions,
        conversionRate: domain.analytics.totalVisits > 0 ? 
          ((domain.analytics.conversions / domain.analytics.totalVisits) * 100).toFixed(2) : 0
      },
      traffic: {
        main: domain.mainPage ? domain.mainPage.analytics.views : 0,
        cloak: domain.cloakPage ? domain.cloakPage.analytics.views : 0
      },
      // 模拟地理位置数据
      geoData: [
        { country: 'China', visits: Math.floor(domain.analytics.totalVisits * 0.6) },
        { country: 'United States', visits: Math.floor(domain.analytics.totalVisits * 0.2) },
        { country: 'United Kingdom', visits: Math.floor(domain.analytics.totalVisits * 0.1) },
        { country: 'Canada', visits: Math.floor(domain.analytics.totalVisits * 0.05) },
        { country: 'Australia', visits: Math.floor(domain.analytics.totalVisits * 0.05) }
      ],
      // 模拟时间数据
      timeData: Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        visits: Math.floor(Math.random() * 50) + 10
      }))
    };
    
    res.json({ analytics });
    
  } catch (error) {
    console.error('Get domain analytics error:', error);
    res.status(500).json({ error: 'Failed to get domain analytics' });
  }
});

// 获取页面分析
router.get('/page/:id', auth, async (req, res) => {
  try {
    const page = await LandingPage.findById(req.params.id);
    
    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }
    
    // 检查权限
    if (req.user.role !== 'admin' && page.createdBy.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // 模拟详细分析数据
    const analytics = {
      summary: {
        views: page.analytics.views,
        uniqueViews: page.analytics.uniqueViews,
        clicks: page.analytics.clicks,
        conversions: page.analytics.conversions,
        bounceRate: '35%',
        avgTimeOnPage: '2m 30s'
      },
      // 模拟点击热图数据
      heatmap: [
        { element: 'header', clicks: Math.floor(page.analytics.clicks * 0.1) },
        { element: 'cta-button', clicks: Math.floor(page.analytics.clicks * 0.6) },
        { element: 'footer', clicks: Math.floor(page.analytics.clicks * 0.1) },
        { element: 'sidebar', clicks: Math.floor(page.analytics.clicks * 0.2) }
      ],
      // 模拟设备数据
      deviceData: [
        { device: 'Desktop', percentage: 45 },
        { device: 'Mobile', percentage: 40 },
        { device: 'Tablet', percentage: 15 }
      ]
    };
    
    res.json({ analytics });
    
  } catch (error) {
    console.error('Get page analytics error:', error);
    res.status(500).json({ error: 'Failed to get page analytics' });
  }
});

// 导出分析数据
router.get('/export', auth, async (req, res) => {
  try {
    const { type = 'domains', format = 'json' } = req.query;
    
    let data = [];
    
    if (type === 'domains') {
      const userQuery = req.user.role === 'admin' ? {} : { createdBy: req.user.userId };
      const domains = await Domain.find(userQuery).populate('createdBy', 'username');
      
      data = domains.map(domain => ({
        domain: domain.domain,
        status: domain.status,
        totalVisits: domain.analytics.totalVisits,
        uniqueVisitors: domain.analytics.uniqueVisitors,
        conversions: domain.analytics.conversions,
        createdAt: domain.createdAt,
        createdBy: domain.createdBy.username
      }));
    } else if (type === 'pages') {
      const userQuery = req.user.role === 'admin' ? {} : { createdBy: req.user.userId };
      const pages = await LandingPage.find(userQuery).populate('createdBy', 'username');
      
      data = pages.map(page => ({
        name: page.name,
        type: page.type,
        template: page.template,
        views: page.analytics.views,
        clicks: page.analytics.clicks,
        conversions: page.analytics.conversions,
        createdAt: page.createdAt,
        createdBy: page.createdBy.username
      }));
    }
    
    if (format === 'csv') {
      // 生成CSV格式
      const headers = Object.keys(data[0] || {});
      const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => row[header]).join(','))
      ].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${type}-analytics.csv`);
      res.send(csvContent);
    } else {
      res.json({ data });
    }
    
  } catch (error) {
    console.error('Export analytics error:', error);
    res.status(500).json({ error: 'Failed to export analytics' });
  }
});

module.exports = router;
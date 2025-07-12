const express = require('express');
const Domain = require('../models/Domain');
const auth = require('../middleware/auth');

const router = express.Router();

// 获取cloak设置
router.get('/settings', auth, async (req, res) => {
  try {
    const settings = {
      facebookUserAgents: [
        'facebookexternalhit',
        'facebookcatalog',
        'facebookplatform',
        'facebookbot',
        'facebook',
        'facebookcrawler',
        'facebook-ads-inspector',
        'facebook-ad-inspector'
      ],
      facebookIpRanges: [
        '31.13.24.0/21',
        '31.13.64.0/18',
        '31.13.66.0/23',
        '31.13.68.0/22',
        '31.13.72.0/21',
        '31.13.80.0/20',
        '31.13.96.0/19',
        '66.220.144.0/20',
        '66.220.160.0/19',
        '69.63.176.0/20',
        '69.171.224.0/19',
        '74.119.76.0/22',
        '173.252.64.0/18',
        '199.201.64.0/22',
        '204.15.20.0/22'
      ],
      suspiciousCountries: ['US', 'GB', 'CA', 'AU', 'IE', 'NZ'],
      proxyDetectionEnabled: true,
      geoLocationEnabled: true,
      headerAnalysisEnabled: true
    };
    
    res.json({ settings });
    
  } catch (error) {
    console.error('Get cloak settings error:', error);
    res.status(500).json({ error: 'Failed to get cloak settings' });
  }
});

// 测试IP地址
router.post('/test-ip', auth, async (req, res) => {
  try {
    const { ip, userAgent } = req.body;
    
    if (!ip) {
      return res.status(400).json({ error: 'IP address is required' });
    }
    
    const geoip = require('geoip-lite');
    const geo = geoip.lookup(ip);
    
    // 模拟cloak检测逻辑
    const result = {
      ip,
      userAgent: userAgent || '',
      geoLocation: geo || {},
      isFacebookBot: false,
      isProxy: false,
      shouldCloak: false,
      reasons: []
    };
    
    // 检查Facebook User-Agent
    if (userAgent) {
      const ua = userAgent.toLowerCase();
      const fbAgents = [
        'facebookexternalhit',
        'facebookcatalog',
        'facebookplatform',
        'facebookbot',
        'facebook',
        'facebookcrawler'
      ];
      
      if (fbAgents.some(agent => ua.includes(agent))) {
        result.isFacebookBot = true;
        result.shouldCloak = true;
        result.reasons.push('Facebook User-Agent detected');
      }
    }
    
    // 检查地理位置
    if (geo) {
      const suspiciousCountries = ['US', 'GB', 'CA', 'AU', 'IE', 'NZ'];
      if (suspiciousCountries.includes(geo.country)) {
        result.reasons.push(`IP from suspicious country: ${geo.country}`);
      }
      
      // 检查是否为数据中心IP
      if (geo.org && (
        geo.org.toLowerCase().includes('hosting') ||
        geo.org.toLowerCase().includes('datacenter') ||
        geo.org.toLowerCase().includes('server') ||
        geo.org.toLowerCase().includes('cloud')
      )) {
        result.isProxy = true;
        result.shouldCloak = true;
        result.reasons.push(`Datacenter/Hosting IP detected: ${geo.org}`);
      }
    }
    
    res.json({ result });
    
  } catch (error) {
    console.error('Test IP error:', error);
    res.status(500).json({ error: 'Failed to test IP' });
  }
});

// 获取访问日志
router.get('/logs', auth, async (req, res) => {
  try {
    const { domainId, page = 1, limit = 50 } = req.query;
    
    // 这里应该从日志存储中获取访问记录
    // 现在返回模拟数据
    const logs = [
      {
        id: '1',
        timestamp: new Date(),
        ip: '173.252.64.15',
        userAgent: 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
        country: 'US',
        city: 'Menlo Park',
        isFacebookBot: true,
        isProxy: false,
        shouldCloak: true,
        action: 'cloaked',
        domain: domainId || 'example.com'
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 3600000),
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        country: 'CN',
        city: 'Beijing',
        isFacebookBot: false,
        isProxy: false,
        shouldCloak: false,
        action: 'allowed',
        domain: domainId || 'example.com'
      }
    ];
    
    res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: logs.length,
        pages: Math.ceil(logs.length / limit)
      }
    });
    
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ error: 'Failed to get logs' });
  }
});

// 获取统计信息
router.get('/stats', auth, async (req, res) => {
  try {
    const { domainId, period = '7d' } = req.query;
    
    // 这里应该从数据库中获取实际统计数据
    // 现在返回模拟数据
    const stats = {
      totalRequests: 1250,
      cloakedRequests: 45,
      allowedRequests: 1205,
      facebookBots: 38,
      proxyIps: 12,
      topCountries: [
        { country: 'CN', count: 800 },
        { country: 'US', count: 250 },
        { country: 'GB', count: 100 },
        { country: 'CA', count: 50 },
        { country: 'AU', count: 30 }
      ],
      cloakRate: 3.6,
      chartData: [
        { date: '2024-01-01', allowed: 150, cloaked: 8 },
        { date: '2024-01-02', allowed: 180, cloaked: 12 },
        { date: '2024-01-03', allowed: 165, cloaked: 6 },
        { date: '2024-01-04', allowed: 200, cloaked: 15 },
        { date: '2024-01-05', allowed: 175, cloaked: 9 },
        { date: '2024-01-06', allowed: 190, cloaked: 11 },
        { date: '2024-01-07', allowed: 145, cloaked: 4 }
      ]
    };
    
    res.json({ stats });
    
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// 白名单管理
router.get('/whitelist', auth, async (req, res) => {
  try {
    // 这里应该从数据库中获取白名单
    const whitelist = {
      ips: [
        '192.168.1.0/24',
        '10.0.0.0/8'
      ],
      userAgents: [
        'GoogleBot',
        'BingBot'
      ],
      countries: ['CN', 'JP', 'KR']
    };
    
    res.json({ whitelist });
    
  } catch (error) {
    console.error('Get whitelist error:', error);
    res.status(500).json({ error: 'Failed to get whitelist' });
  }
});

// 更新白名单
router.post('/whitelist', auth, async (req, res) => {
  try {
    const { ips, userAgents, countries } = req.body;
    
    // 这里应该更新数据库中的白名单
    // 现在只返回成功消息
    
    res.json({ message: 'Whitelist updated successfully' });
    
  } catch (error) {
    console.error('Update whitelist error:', error);
    res.status(500).json({ error: 'Failed to update whitelist' });
  }
});

// 黑名单管理
router.get('/blacklist', auth, async (req, res) => {
  try {
    // 这里应该从数据库中获取黑名单
    const blacklist = {
      ips: [
        '173.252.64.0/18',
        '199.201.64.0/22'
      ],
      userAgents: [
        'facebookexternalhit',
        'facebookbot'
      ],
      countries: []
    };
    
    res.json({ blacklist });
    
  } catch (error) {
    console.error('Get blacklist error:', error);
    res.status(500).json({ error: 'Failed to get blacklist' });
  }
});

// 更新黑名单
router.post('/blacklist', auth, async (req, res) => {
  try {
    const { ips, userAgents, countries } = req.body;
    
    // 这里应该更新数据库中的黑名单
    // 现在只返回成功消息
    
    res.json({ message: 'Blacklist updated successfully' });
    
  } catch (error) {
    console.error('Update blacklist error:', error);
    res.status(500).json({ error: 'Failed to update blacklist' });
  }
});

module.exports = router;
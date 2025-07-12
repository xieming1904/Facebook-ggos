const geoip = require('geoip-lite');
const useragent = require('express-useragent');
const Domain = require('../models/Domain');
const LandingPage = require('../models/LandingPage');

// Facebook爬虫的常见User-Agent关键词
const FACEBOOK_USER_AGENTS = [
  'facebookexternalhit',
  'facebookcatalog',
  'facebookplatform',
  'facebookbot',
  'facebook',
  'facebookcrawler',
  'facebook-ads-inspector',
  'facebook-ad-inspector'
];

// 已知的Facebook IP段
const FACEBOOK_IP_RANGES = [
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
];

// 代理/VPN服务提供商的IP段
const PROXY_IP_RANGES = [
  // 常见代理服务商IP段
  '185.220.100.0/22',
  '185.220.101.0/24',
  '199.87.154.0/24',
  '192.42.116.0/22'
];

// 可疑的国家/地区代码
const SUSPICIOUS_COUNTRIES = ['US', 'GB', 'CA', 'AU', 'IE', 'NZ'];

// 检查IP是否在指定IP段内
function isIpInRange(ip, ranges) {
  const ipParts = ip.split('.').map(Number);
  const ipNum = (ipParts[0] << 24) + (ipParts[1] << 16) + (ipParts[2] << 8) + ipParts[3];
  
  return ranges.some(range => {
    const [rangeIp, cidr] = range.split('/');
    const rangeParts = rangeIp.split('.').map(Number);
    const rangeNum = (rangeParts[0] << 24) + (rangeParts[1] << 16) + (rangeParts[2] << 8) + rangeParts[3];
    const mask = ~(Math.pow(2, 32 - parseInt(cidr)) - 1);
    
    return (ipNum & mask) === (rangeNum & mask);
  });
}

// 检查User-Agent是否为Facebook爬虫
function isFacebookBot(userAgent) {
  const ua = userAgent.toLowerCase();
  return FACEBOOK_USER_AGENTS.some(agent => ua.includes(agent));
}

// 检查是否为可疑的代理IP
function isProxyIp(ip, geo) {
  // 检查是否在已知代理IP段内
  if (isIpInRange(ip, PROXY_IP_RANGES)) {
    return true;
  }
  
  // 检查地理位置信息
  if (geo) {
    // 如果来自数据中心或托管服务提供商
    if (geo.org && (
      geo.org.toLowerCase().includes('hosting') ||
      geo.org.toLowerCase().includes('datacenter') ||
      geo.org.toLowerCase().includes('server') ||
      geo.org.toLowerCase().includes('cloud')
    )) {
      return true;
    }
  }
  
  return false;
}

// 检查访问模式是否可疑
function isSuspiciousPattern(req) {
  // 检查是否缺少常见的浏览器头部
  const headers = req.headers;
  
  // 正常浏览器通常会发送这些头部
  const browserHeaders = [
    'accept-language',
    'accept-encoding',
    'cache-control',
    'sec-fetch-dest',
    'sec-fetch-mode',
    'sec-fetch-site'
  ];
  
  let missingHeaders = 0;
  browserHeaders.forEach(header => {
    if (!headers[header]) {
      missingHeaders++;
    }
  });
  
  // 如果缺少太多浏览器头部，可能是爬虫
  return missingHeaders > 3;
}

module.exports = async (req, res, next) => {
  try {
    const pageId = req.params.id;
    const clientIp = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    const userAgent = req.get('User-Agent') || '';
    const ua = useragent.parse(userAgent);
    
    // 获取地理位置信息
    const geo = geoip.lookup(clientIp);
    
    // 记录访问信息
    const accessInfo = {
      ip: clientIp,
      userAgent: userAgent,
      country: geo ? geo.country : 'Unknown',
      city: geo ? geo.city : 'Unknown',
      timestamp: new Date(),
      isFacebookBot: false,
      isProxy: false,
      shouldCloak: false
    };
    
    // 检查是否为Facebook爬虫
    if (isFacebookBot(userAgent)) {
      accessInfo.isFacebookBot = true;
      accessInfo.shouldCloak = true;
    }
    
    // 检查是否为Facebook IP
    if (isIpInRange(clientIp, FACEBOOK_IP_RANGES)) {
      accessInfo.isFacebookBot = true;
      accessInfo.shouldCloak = true;
    }
    
    // 检查是否为代理IP
    if (isProxyIp(clientIp, geo)) {
      accessInfo.isProxy = true;
      accessInfo.shouldCloak = true;
    }
    
    // 检查访问模式是否可疑
    if (isSuspiciousPattern(req)) {
      accessInfo.shouldCloak = true;
    }
    
    // 检查地理位置是否可疑
    if (geo && SUSPICIOUS_COUNTRIES.includes(geo.country)) {
      // 如果来自可疑国家且其他指标也可疑，则启用cloak
      if (accessInfo.isProxy || accessInfo.isFacebookBot) {
        accessInfo.shouldCloak = true;
      }
    }
    
    // 将访问信息附加到请求对象
    req.accessInfo = accessInfo;
    
    // 查找域名配置
    const host = req.get('host');
    const domain = await Domain.findOne({ domain: host, isActive: true });
    
    if (domain && domain.cloakEnabled && accessInfo.shouldCloak) {
      // 如果需要cloak，返回cloak页面
      if (domain.cloakPage) {
        const cloakPage = await LandingPage.findById(domain.cloakPage);
        if (cloakPage) {
          // 更新统计信息
          domain.analytics.totalVisits += 1;
          await domain.save();
          
          cloakPage.analytics.views += 1;
          await cloakPage.save();
          
          // 返回cloak页面内容
          const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
              <title>${cloakPage.seo.title || 'News'}</title>
              <meta name="description" content="${cloakPage.seo.description || ''}">
              <meta name="keywords" content="${cloakPage.seo.keywords || ''}">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>${cloakPage.content.css}</style>
            </head>
            <body>
              ${cloakPage.content.html}
              <script>${cloakPage.content.js}</script>
            </body>
            </html>
          `;
          
          return res.send(htmlContent);
        }
      }
      
      // 如果没有配置cloak页面，返回默认的新闻页面
      const defaultCloakContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Breaking News - Latest Updates</title>
          <meta name="description" content="Stay updated with the latest breaking news and current events">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
            h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
            .news-item { margin: 20px 0; padding: 15px; border-left: 4px solid #007bff; }
            .date { color: #666; font-size: 0.9em; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Breaking News</h1>
            <div class="news-item">
              <h3>Technology Sector Shows Strong Growth</h3>
              <p class="date">Published: ${new Date().toLocaleDateString()}</p>
              <p>The technology sector continues to demonstrate robust performance with several companies reporting record quarterly earnings...</p>
            </div>
            <div class="news-item">
              <h3>Global Market Update</h3>
              <p class="date">Published: ${new Date().toLocaleDateString()}</p>
              <p>Financial markets around the world are showing positive trends as investors respond to favorable economic indicators...</p>
            </div>
          </div>
        </body>
        </html>
      `;
      
      return res.send(defaultCloakContent);
    }
    
    // 如果不需要cloak，继续到下一个中间件
    next();
    
  } catch (error) {
    console.error('Cloak middleware error:', error);
    next();
  }
};
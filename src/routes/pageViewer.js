const express = require('express');
const Domain = require('../models/Domain');
const LandingPage = require('../models/LandingPage');

const router = express.Router();

// 落地页查看器
router.get('/', async (req, res) => {
  try {
    const pageId = req.params.id;
    const host = req.get('host');
    
    // 获取域名配置
    const domain = await Domain.findOne({ domain: host, isActive: true })
      .populate('mainPage')
      .populate('cloakPage');
    
    if (!domain) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Page Not Found</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .error { color: #e74c3c; }
          </style>
        </head>
        <body>
          <h1 class="error">404 - Page Not Found</h1>
          <p>The requested page could not be found.</p>
        </body>
        </html>
      `);
    }
    
    // 如果已经通过cloak中间件处理，直接返回主页面
    const landingPage = await LandingPage.findById(pageId) || domain.mainPage;
    
    if (!landingPage) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Page Not Found</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .error { color: #e74c3c; }
          </style>
        </head>
        <body>
          <h1 class="error">404 - Page Not Found</h1>
          <p>The requested landing page could not be found.</p>
        </body>
        </html>
      `);
    }
    
    // 更新统计信息
    try {
      domain.analytics.totalVisits += 1;
      await domain.save();
      
      landingPage.analytics.views += 1;
      await landingPage.save();
    } catch (statsError) {
      console.error('Error updating stats:', statsError);
    }
    
    // 渲染页面
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${landingPage.seo.title || landingPage.name}</title>
        <meta name="description" content="${landingPage.seo.description || ''}">
        <meta name="keywords" content="${landingPage.seo.keywords || ''}">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta charset="UTF-8">
        <style>
          ${landingPage.content.css}
        </style>
      </head>
      <body>
        ${landingPage.content.html}
        <script>
          ${landingPage.content.js}
        </script>
        <!-- Analytics Script -->
        <script>
          (function() {
            // 基础分析跟踪
            const startTime = Date.now();
            
            // 页面加载完成时发送分析数据
            window.addEventListener('load', function() {
              const loadTime = Date.now() - startTime;
              
              // 发送分析数据到服务器
              fetch('/api/analytics/track', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  pageId: '${landingPage._id}',
                  domainId: '${domain._id}',
                  loadTime: loadTime,
                  timestamp: new Date().toISOString(),
                  userAgent: navigator.userAgent,
                  referrer: document.referrer,
                  screenResolution: screen.width + 'x' + screen.height,
                  language: navigator.language
                })
              }).catch(err => console.error('Analytics error:', err));
            });
            
            // 点击跟踪
            document.addEventListener('click', function(e) {
              if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON') {
                fetch('/api/analytics/track-click', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    pageId: '${landingPage._id}',
                    domainId: '${domain._id}',
                    element: e.target.tagName,
                    text: e.target.textContent?.substring(0, 100),
                    href: e.target.href,
                    timestamp: new Date().toISOString()
                  })
                }).catch(err => console.error('Click analytics error:', err));
              }
            });
          })();
        </script>
      </body>
      </html>
    `;
    
    res.send(htmlContent);
    
  } catch (error) {
    console.error('Page viewer error:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Server Error</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .error { color: #e74c3c; }
        </style>
      </head>
      <body>
        <h1 class="error">500 - Server Error</h1>
        <p>Something went wrong. Please try again later.</p>
      </body>
      </html>
    `);
  }
});

module.exports = router;
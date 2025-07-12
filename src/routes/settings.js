const express = require('express');
const auth = require('../middleware/auth');
const Setting = require('../models/Setting');

const router = express.Router();

// 获取所有设置
router.get('/', auth, async (req, res) => {
  try {
    const settings = await Setting.findOne({ type: 'system' }) || {
      general: {
        siteName: 'Facebook广告系统',
        siteDescription: '专业的广告落地页管理系统',
        maxFileSize: 10,
        allowedFileTypes: 'jpg,jpeg,png,gif,pdf,zip',
        emailNotifications: true,
        autoBackup: false,
        backupRetention: 30
      },
      security: {
        loginAttempts: 5,
        lockoutDuration: 30,
        sessionTimeout: 24,
        enableTwoFactor: false,
        passwordMinLength: 8,
        forceHttps: true,
        rateLimitRequests: 100,
        rateLimitWindow: 15
      },
      cloak: {
        enableCloak: true,
        detectionSensitivity: 'medium',
        autoUpdateRules: true,
        logRetention: 30,
        blockUnknownBots: false,
        customUserAgents: '',
        customIpRules: ''
      }
    };

    res.json({ settings });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

// 更新通用设置
router.put('/general', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    let settings = await Setting.findOne({ type: 'system' });
    if (!settings) {
      settings = new Setting({ type: 'system' });
    }

    settings.general = { ...settings.general, ...req.body };
    settings.updatedAt = new Date();
    settings.updatedBy = req.user.userId;

    await settings.save();

    res.json({ message: 'General settings updated successfully' });
  } catch (error) {
    console.error('Update general settings error:', error);
    res.status(500).json({ error: 'Failed to update general settings' });
  }
});

// 更新安全设置
router.put('/security', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    let settings = await Setting.findOne({ type: 'system' });
    if (!settings) {
      settings = new Setting({ type: 'system' });
    }

    settings.security = { ...settings.security, ...req.body };
    settings.updatedAt = new Date();
    settings.updatedBy = req.user.userId;

    await settings.save();

    res.json({ message: 'Security settings updated successfully' });
  } catch (error) {
    console.error('Update security settings error:', error);
    res.status(500).json({ error: 'Failed to update security settings' });
  }
});

// 更新Cloak设置
router.put('/cloak', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    let settings = await Setting.findOne({ type: 'system' });
    if (!settings) {
      settings = new Setting({ type: 'system' });
    }

    settings.cloak = { ...settings.cloak, ...req.body };
    settings.updatedAt = new Date();
    settings.updatedBy = req.user.userId;

    await settings.save();

    res.json({ message: 'Cloak settings updated successfully' });
  } catch (error) {
    console.error('Update cloak settings error:', error);
    res.status(500).json({ error: 'Failed to update cloak settings' });
  }
});

module.exports = router;
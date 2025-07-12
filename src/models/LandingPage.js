const mongoose = require('mongoose');

const landingPageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['main', 'cloak', 'redirect'],
    required: true
  },
  content: {
    html: {
      type: String,
      required: true
    },
    css: {
      type: String,
      default: ''
    },
    js: {
      type: String,
      default: ''
    }
  },
  seo: {
    title: {
      type: String,
      default: ''
    },
    description: {
      type: String,
      default: ''
    },
    keywords: {
      type: String,
      default: ''
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  template: {
    type: String,
    enum: ['custom', 'news', 'blog', 'shop', 'corporate'],
    default: 'custom'
  },
  screenshots: [{
    url: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  analytics: {
    views: {
      type: Number,
      default: 0
    },
    uniqueViews: {
      type: Number,
      default: 0
    },
    clicks: {
      type: Number,
      default: 0
    },
    conversions: {
      type: Number,
      default: 0
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

landingPageSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('LandingPage', landingPageSchema);
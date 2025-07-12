const mongoose = require('mongoose');

const domainSchema = new mongoose.Schema({
  domain: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sslEnabled: {
    type: Boolean,
    default: false
  },
  redirectUrl: {
    type: String,
    trim: true
  },
  cloakEnabled: {
    type: Boolean,
    default: true
  },
  cloakPage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LandingPage'
  },
  mainPage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LandingPage'
  },
  analytics: {
    totalVisits: {
      type: Number,
      default: 0
    },
    uniqueVisitors: {
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
  lastChecked: {
    type: Date
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'blocked', 'pending'],
    default: 'pending'
  }
});

module.exports = mongoose.model('Domain', domainSchema);
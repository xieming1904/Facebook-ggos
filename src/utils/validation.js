const mongoose = require('mongoose');

// Validate MongoDB ObjectId
const validateObjectId = (id) => {
  if (!id) {
    return false;
  }
  
  // Check if it's a valid ObjectId format
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return false;
  }
  
  // Additional check to ensure it's a proper ObjectId string
  // (mongoose.Types.ObjectId.isValid can return true for some invalid strings)
  if (String(new mongoose.Types.ObjectId(id)) !== id) {
    return false;
  }
  
  return true;
};

// Middleware to validate ObjectId in request parameters
const validateObjectIdParam = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!validateObjectId(id)) {
      return res.status(400).json({ 
        error: `Invalid ${paramName} format` 
      });
    }
    
    next();
  };
};

// Validate email format
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate password strength
const validatePassword = (password) => {
  // Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

// Validate username format
const validateUsername = (username) => {
  // Username must be 3-20 characters long and can only contain letters, numbers, and underscores
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
};

// Sanitize string input
const sanitizeString = (str) => {
  if (typeof str !== 'string') {
    return '';
  }
  
  return str.trim();
};

// Validate and sanitize pagination parameters
const validatePagination = (page, limit) => {
  const validatedPage = Math.max(1, parseInt(page) || 1);
  const validatedLimit = Math.min(100, Math.max(1, parseInt(limit) || 10));
  
  return {
    page: validatedPage,
    limit: validatedLimit,
    skip: (validatedPage - 1) * validatedLimit
  };
};

module.exports = {
  validateObjectId,
  validateObjectIdParam,
  validateEmail,
  validatePassword,
  validateUsername,
  sanitizeString,
  validatePagination
};
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

/**
 * Hash a password using bcrypt
 * @param {String} password - Plain text password
 * @param {Number} saltRounds - Number of salt rounds (default 10)
 * @returns {Promise<String>} - Hashed password
 */
const hashPassword = async (password, saltRounds = 10) => {
  try {
    const salt = await bcrypt.genSalt(saltRounds);
    return await bcrypt.hash(password, salt);
  } catch (error) {
    throw new Error('Password hashing failed');
  }
};

/**
 * Compare password with hash
 * @param {String} password - Plain text password
 * @param {String} hash - Hashed password
 * @returns {Promise<Boolean>} - True if password matches
 */
const comparePassword = async (password, hash) => {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

/**
 * Generate random OTP
 * @param {Number} length - OTP length (default 6)
 * @returns {String} - Generated OTP
 */
const generateOTP = (length = 6) => {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }
  return otp;
};

/**
 * Generate secure random token
 * @param {Number} length - Token length in bytes (default 32)
 * @returns {String} - Random token in hex format
 */
const generateRandomToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Generate UUID v4
 * @returns {String} - UUID
 */
const generateUUID = () => {
  return crypto.randomUUID();
};

/**
 * Hash data using SHA-256
 * @param {String} data - Data to hash
 * @returns {String} - Hashed data
 */
const hashSHA256 = (data) => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * Hash data using MD5 (not recommended for passwords)
 * @param {String} data - Data to hash
 * @returns {String} - Hashed data
 */
const hashMD5 = (data) => {
  return crypto.createHash('md5').update(data).digest('hex');
};

/**
 * Encrypt data using AES-256-CBC
 * @param {String} text - Text to encrypt
 * @param {String} key - Encryption key (should be from env)
 * @returns {String} - Encrypted data (iv:encrypted)
 */
const encrypt = (text, key = process.env.ENCRYPTION_KEY) => {
  if (!key) {
    throw new Error('Encryption key not configured');
  }

  // Generate random IV
  const iv = crypto.randomBytes(16);
  
  // Create cipher
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(key.substring(0, 32)),
    iv
  );

  // Encrypt
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Return IV + encrypted data
  return iv.toString('hex') + ':' + encrypted;
};

/**
 * Decrypt data using AES-256-CBC
 * @param {String} encryptedData - Encrypted data (iv:encrypted)
 * @param {String} key - Decryption key (should be from env)
 * @returns {String} - Decrypted text
 */
const decrypt = (encryptedData, key = process.env.ENCRYPTION_KEY) => {
  if (!key) {
    throw new Error('Encryption key not configured');
  }

  // Split IV and encrypted data
  const parts = encryptedData.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];

  // Create decipher
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(key.substring(0, 32)),
    iv
  );

  // Decrypt
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
};

/**
 * Generate HMAC signature
 * @param {String} data - Data to sign
 * @param {String} secret - Secret key
 * @returns {String} - HMAC signature
 */
const generateHMAC = (data, secret = process.env.JWT_SECRET) => {
  return crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');
};

/**
 * Verify HMAC signature
 * @param {String} data - Original data
 * @param {String} signature - Signature to verify
 * @param {String} secret - Secret key
 * @returns {Boolean} - True if signature is valid
 */
const verifyHMAC = (data, signature, secret = process.env.JWT_SECRET) => {
  const expected = generateHMAC(data, secret);
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
};

/**
 * Mask sensitive data (for logging/display)
 * @param {String} data - Data to mask
 * @param {Number} visibleChars - Number of visible characters at start/end
 * @returns {String} - Masked data
 */
const maskSensitiveData = (data, visibleChars = 4) => {
  if (!data || data.length <= visibleChars * 2) {
    return '***';
  }
  const start = data.substring(0, visibleChars);
  const end = data.substring(data.length - visibleChars);
  const maskLength = data.length - (visibleChars * 2);
  return `${start}${'*'.repeat(Math.min(maskLength, 8))}${end}`;
};

/**
 * Mask phone number
 * @param {String} phoneNumber - Phone number to mask
 * @returns {String} - Masked phone number
 */
const maskPhoneNumber = (phoneNumber) => {
  if (!phoneNumber || phoneNumber.length < 10) {
    return '***';
  }
  const lastFour = phoneNumber.slice(-4);
  return `******${lastFour}`;
};

/**
 * Mask email address
 * @param {String} email - Email to mask
 * @returns {String} - Masked email
 */
const maskEmail = (email) => {
  if (!email || !email.includes('@')) {
    return '***';
  }
  const [username, domain] = email.split('@');
  const maskedUsername = username.charAt(0) + '***' + username.charAt(username.length - 1);
  return `${maskedUsername}@${domain}`;
};

/**
 * Mask card number
 * @param {String} cardNumber - Card number to mask
 * @returns {String} - Masked card number
 */
const maskCardNumber = (cardNumber) => {
  if (!cardNumber || cardNumber.length < 16) {
    return '***';
  }
  const lastFour = cardNumber.slice(-4);
  return `**** **** **** ${lastFour}`;
};

/**
 * Generate secure random password
 * @param {Number} length - Password length (default 12)
 * @param {Object} options - Options for password generation
 * @returns {String} - Generated password
 */
const generateSecurePassword = (length = 12, options = {}) => {
  const {
    includeUppercase = true,
    includeLowercase = true,
    includeNumbers = true,
    includeSymbols = true,
  } = options;

  let chars = '';
  if (includeUppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (includeLowercase) chars += 'abcdefghijklmnopqrstuvwxyz';
  if (includeNumbers) chars += '0123456789';
  if (includeSymbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';

  if (chars.length === 0) {
    throw new Error('At least one character set must be included');
  }

  let password = '';
  const bytes = crypto.randomBytes(length);
  
  for (let i = 0; i < length; i++) {
    password += chars[bytes[i] % chars.length];
  }

  return password;
};

/**
 * Check password strength
 * @param {String} password - Password to check
 * @returns {Object} - Strength analysis
 */
const checkPasswordStrength = (password) => {
  const result = {
    score: 0,
    strength: 'weak',
    suggestions: [],
  };

  if (password.length >= 8) result.score += 1;
  else result.suggestions.push('Use at least 8 characters');

  if (password.length >= 12) result.score += 1;

  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) result.score += 1;
  else result.suggestions.push('Use both uppercase and lowercase letters');

  if (/\d/.test(password)) result.score += 1;
  else result.suggestions.push('Include numbers');

  if (/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password)) result.score += 1;
  else result.suggestions.push('Include special characters');

  // Determine strength
  if (result.score <= 2) {
    result.strength = 'weak';
  } else if (result.score <= 3) {
    result.strength = 'medium';
  } else if (result.score <= 4) {
    result.strength = 'strong';
  } else {
    result.strength = 'very strong';
  }

  return result;
};

module.exports = {
  // Password hashing
  hashPassword,
  comparePassword,

  // OTP and tokens
  generateOTP,
  generateRandomToken,
  generateUUID,

  // Hashing
  hashSHA256,
  hashMD5,

  // Encryption
  encrypt,
  decrypt,

  // HMAC
  generateHMAC,
  verifyHMAC,

  // Masking
  maskSensitiveData,
  maskPhoneNumber,
  maskEmail,
  maskCardNumber,

  // Password utilities
  generateSecurePassword,
  checkPasswordStrength,
};
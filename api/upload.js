// POST /api/upload — העלאת תמונה ל-images/uploads/ (commit ל-GitHub).
// מקבל { filename, data } כאשר data הוא dataURL (base64).
'use strict';

const crypto = require('crypto');
const utils = require('./_utils');

const ALLOWED = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
};
const MAX_BASE64_CHARS = 6 * 1024 * 1024; // ~4.4MB בפועל — בתוך מגבלת הגוף של Vercel

module.exports = async function handler(req, res) {
  utils.noStore(res);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!utils.getAuth(req)) {
    return res.status(401).json({ error: 'נדרשת התחברות' });
  }

  try {
    const body = req.body || {};
    const data = String(body.data || '');

    const m = data.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (!m) {
      return res.status(400).json({ error: 'פורמט תמונה לא נתמך (רק JPG / PNG / WebP)' });
    }
    const mime = m[1];
    const base64 = m[2];
    if (base64.length > MAX_BASE64_CHARS) {
      return res.status(413).json({ error: 'התמונה גדולה מדי (עד ~4MB)' });
    }

    // שם קובץ בטוח באנגלית — יציב יותר מכתובות עם עברית/רווחים
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = crypto.randomBytes(3).toString('hex');
    const path = 'images/uploads/img-' + stamp + '-' + rand + ALLOWED[mime];

    await utils.ghPutFile(path, base64, 'העלאת תמונה דרך ממשק הניהול');
    return res.status(200).json({ path: path });
  } catch (err) {
    return res.status(502).json({ error: err.message || 'שגיאת שרת' });
  }
};

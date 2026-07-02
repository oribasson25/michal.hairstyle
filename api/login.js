// POST /api/login — התחברות עם שם משתמש וסיסמה.
// הסיסמה מאומתת מול hash (scrypt) שמאוחסן ב-Environment Variables של Vercel.
'use strict';

const utils = require('./_utils');

// הגבלת נסיונות בסיסית לכל אינסטנס (הגנה מפני ניחוש סיסמאות)
const attempts = new Map(); // ip -> { count, resetAt }
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function tooManyAttempts(ip) {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || rec.resetAt < now) {
    attempts.set(ip, { count: 0, resetAt: now + WINDOW_MS });
    return false;
  }
  return rec.count >= MAX_ATTEMPTS;
}
function recordFailure(ip) {
  const rec = attempts.get(ip);
  if (rec) rec.count++;
}

function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

module.exports = async function handler(req, res) {
  utils.noStore(res);
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ADMIN_USER = process.env.ADMIN_USER;
  const ADMIN_PASS_HASH = process.env.ADMIN_PASS_HASH;
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!ADMIN_USER || !ADMIN_PASS_HASH || !JWT_SECRET) {
    return res.status(500).json({ error: 'הממשק עדיין לא הוגדר — חסרים משתני סביבה (ראו ADMIN_SETUP.md)' });
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (tooManyAttempts(ip)) {
    return res.status(429).json({ error: 'יותר מדי נסיונות. נסו שוב בעוד רבע שעה.' });
  }

  const body = req.body || {};
  const username = String(body.username || '');
  const password = String(body.password || '');

  const userOk = username === ADMIN_USER;
  const passOk = utils.verifyPassword(password, ADMIN_PASS_HASH);

  if (!userOk || !passOk) {
    recordFailure(ip);
    await sleep(500); // האטה מכוונת נגד ניחוש
    return res.status(401).json({ error: 'שם משתמש או סיסמה שגויים' });
  }

  const now = Math.floor(Date.now() / 1000);
  const token = utils.signToken({ sub: username, iat: now, exp: now + utils.SESSION_SECONDS }, JWT_SECRET);
  res.setHeader('Set-Cookie', utils.sessionCookie(token));
  return res.status(200).json({ ok: true });
};

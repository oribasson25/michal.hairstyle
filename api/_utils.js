// עזרי אבטחה ו-GitHub משותפים לכל ה-API.
// קבצים שמתחילים בקו תחתון בתיקיית api/ אינם נחשפים כ-endpoints ב-Vercel.
'use strict';

const crypto = require('crypto');

const REPO = process.env.GITHUB_REPO || 'oribasson25/michal.hairstyle';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const COOKIE_NAME = 'admin_token';
const SESSION_SECONDS = 8 * 60 * 60; // 8 שעות

/* ===== base64url ===== */
function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlJson(obj) {
  return b64url(JSON.stringify(obj));
}

/* ===== JWT (HS256, ללא תלויות) ===== */
function signToken(payload, secret) {
  const header = b64urlJson({ alg: 'HS256', typ: 'JWT' });
  const body = b64urlJson(payload);
  const sig = b64url(crypto.createHmac('sha256', secret).update(header + '.' + body).digest());
  return header + '.' + body + '.' + sig;
}

function verifyToken(token, secret) {
  try {
    const parts = String(token || '').split('.');
    if (parts.length !== 3) return null;
    const expected = b64url(crypto.createHmac('sha256', secret).update(parts[0] + '.' + parts[1]).digest());
    const a = Buffer.from(parts[2]);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

/* ===== סיסמה: pbkdf2$iterations$saltHex$hashHex או scrypt$N$r$p$saltHex$hashHex ===== */
function verifyPassword(password, stored) {
  try {
    const parts = String(stored || '').split('$');
    if (parts[0] === 'pbkdf2' && parts.length === 4) {
      const iterations = parseInt(parts[1], 10);
      const salt = Buffer.from(parts[2], 'hex');
      const hash = Buffer.from(parts[3], 'hex');
      const key = crypto.pbkdf2Sync(String(password), salt, iterations, hash.length, 'sha256');
      return crypto.timingSafeEqual(key, hash);
    }
    if (parts[0] === 'scrypt' && parts.length === 6) {
      const N = parseInt(parts[1], 10), r = parseInt(parts[2], 10), p = parseInt(parts[3], 10);
      const salt = Buffer.from(parts[4], 'hex');
      const hash = Buffer.from(parts[5], 'hex');
      const key = crypto.scryptSync(String(password), salt, hash.length, { N: N, r: r, p: p, maxmem: 64 * 1024 * 1024 });
      return crypto.timingSafeEqual(key, hash);
    }
    return false;
  } catch (e) {
    return false;
  }
}

/* ===== auth guard ===== */
function getAuth(req) {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  const cookies = req.cookies || parseCookieHeader(req.headers && req.headers.cookie);
  return verifyToken(cookies[COOKIE_NAME], secret);
}

function parseCookieHeader(header) {
  const out = {};
  String(header || '').split(';').forEach(function (part) {
    const i = part.indexOf('=');
    if (i > -1) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

function sessionCookie(token) {
  return COOKIE_NAME + '=' + token + '; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=' + SESSION_SECONDS;
}
function clearCookie() {
  return COOKIE_NAME + '=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0';
}

/* ===== GitHub contents API ===== */
async function ghRequest(method, apiPath, body) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN חסר בהגדרות השרת');
  const res = await fetch('https://api.github.com' + apiPath, {
    method: method,
    headers: {
      'Authorization': 'Bearer ' + token,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'michal-hairstyle-admin',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  return res;
}

async function ghGetFile(path) {
  const res = await ghRequest('GET', '/repos/' + REPO + '/contents/' + encodeURIComponent(path).replace(/%2F/g, '/') + '?ref=' + BRANCH);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('GitHub קריאה נכשלה (' + res.status + ')');
  return res.json(); // { content: base64, sha, ... }
}

async function ghPutFile(path, contentBase64, message, sha) {
  const body = { message: message, content: contentBase64, branch: BRANCH };
  if (sha) body.sha = sha;
  const res = await ghRequest('PUT', '/repos/' + REPO + '/contents/' + encodeURIComponent(path).replace(/%2F/g, '/'), body);
  if (!res.ok) {
    const detail = await res.text().catch(function () { return ''; });
    throw new Error('GitHub כתיבה נכשלה (' + res.status + '): ' + detail.slice(0, 200));
  }
  return res.json();
}

function noStore(res) {
  res.setHeader('Cache-Control', 'no-store');
}

module.exports = {
  signToken: signToken,
  verifyToken: verifyToken,
  verifyPassword: verifyPassword,
  getAuth: getAuth,
  sessionCookie: sessionCookie,
  clearCookie: clearCookie,
  ghGetFile: ghGetFile,
  ghPutFile: ghPutFile,
  noStore: noStore,
  SESSION_SECONDS: SESSION_SECONDS
};

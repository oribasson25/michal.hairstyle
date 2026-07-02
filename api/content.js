// GET  /api/content — קריאת content/site.json מ-GitHub (המקור העדכני ביותר).
// PUT  /api/content — שמירת תוכן חדש כ-commit → Vercel מפרסם אוטומטית.
'use strict';

const utils = require('./_utils');

const CONTENT_PATH = 'content/site.json';
const MAX_CONTENT_BYTES = 500 * 1024;

module.exports = async function handler(req, res) {
  utils.noStore(res);

  if (!utils.getAuth(req)) {
    return res.status(401).json({ error: 'נדרשת התחברות' });
  }

  try {
    if (req.method === 'GET') {
      const file = await utils.ghGetFile(CONTENT_PATH);
      if (!file) return res.status(404).json({ error: 'קובץ התוכן לא נמצא' });
      const json = JSON.parse(Buffer.from(file.content, 'base64').toString('utf8'));
      return res.status(200).json({ content: json });
    }

    if (req.method === 'PUT') {
      const body = req.body || {};
      const content = body.content;
      if (!content || typeof content !== 'object' || Array.isArray(content)) {
        return res.status(400).json({ error: 'תוכן לא תקין' });
      }
      const text = JSON.stringify(content, null, 2) + '\n';
      if (Buffer.byteLength(text, 'utf8') > MAX_CONTENT_BYTES) {
        return res.status(413).json({ error: 'התוכן גדול מדי' });
      }

      // sha נוכחי נדרש לעדכון קובץ קיים
      const existing = await utils.ghGetFile(CONTENT_PATH);
      await utils.ghPutFile(
        CONTENT_PATH,
        Buffer.from(text, 'utf8').toString('base64'),
        'עדכון תוכן דרך ממשק הניהול',
        existing ? existing.sha : undefined
      );
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(502).json({ error: err.message || 'שגיאת שרת' });
  }
};

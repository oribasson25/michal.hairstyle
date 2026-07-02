// POST /api/logout — יציאה (מחיקת עוגיית ההתחברות).
'use strict';

const utils = require('./_utils');

module.exports = function handler(req, res) {
  utils.noStore(res);
  res.setHeader('Set-Cookie', utils.clearCookie());
  return res.status(200).json({ ok: true });
};

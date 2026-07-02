# הגדרת ממשק הניהול (חד-פעמי, ~5 דקות)

ממשק הניהול נמצא בכתובת: `https://<האתר-שלך>/admin`
כדי שהוא יעבוד, צריך להגדיר ב-Vercel חמישה משתני סביבה (Environment Variables).

## שלב 1 — יצירת טוקן GitHub

1. היכנסו אל: https://github.com/settings/personal-access-tokens/new
2. **Token name**: `michal-site-admin`
3. **Expiration**: מומלץ שנה (אחרי שנה פשוט מייצרים חדש ומעדכנים ב-Vercel)
4. **Repository access** → בחרו **Only select repositories** → בחרו את `michal.hairstyle`
5. תחת **Permissions → Repository permissions** → **Contents** → בחרו **Read and write**
6. לחצו **Generate token** והעתיקו את הטוקן (מתחיל ב-`github_pat_`)

> ⚠️ **לעולם אל תדביקו את הטוקן בקובץ בפרויקט** — הריפו ציבורי. הטוקן מודבק אך ורק ב-Vercel (שלב 4).

## שלב 2 — יצירת סיסמה מוצפנת (hash)

בחרו סיסמה חזקה (לא שם או מילה פשוטה), ואז הריצו בטרמינל (החליפו את `הסיסמה-שלכם`):

```bash
python3 -c "import hashlib,os; pw='הסיסמה-שלכם'.encode(); salt=os.urandom(16); key=hashlib.pbkdf2_hmac('sha256', pw, salt, 310000, dklen=32); print('pbkdf2\$310000\$'+salt.hex()+'\$'+key.hex())"
```

העתיקו את הפלט (מתחיל ב-`pbkdf2$`).

## שלב 3 — יצירת מפתח חתימה אקראי

```bash
python3 -c "import os; print(os.urandom(32).hex())"
```

העתיקו את הפלט.

## שלב 4 — הזנת המשתנים ב-Vercel

היכנסו ל-Vercel → הפרויקט של האתר → **Settings** → **Environment Variables**, והוסיפו:

| Name | Value |
|---|---|
| `GITHUB_TOKEN` | הטוקן משלב 1 |
| `GITHUB_REPO` | `oribasson25/michal.hairstyle` |
| `ADMIN_USER` | שם המשתמש שבחרתם (למשל `michal`) |
| `ADMIN_PASS_HASH` | הפלט משלב 2 (כולל ה-`pbkdf2$...`) |
| `JWT_SECRET` | הפלט משלב 3 |

בכל אחד — סמנו את כל הסביבות (Production, Preview, Development).

## שלב 5 — פרסום מחדש

Vercel → **Deployments** → שלוש נקודות על הדיפלוי האחרון → **Redeploy**.

## זהו! 🎉

גשו ל-`https://<האתר-שלך>/admin`, התחברו עם שם המשתמש והסיסמה — ותוכלו לערוך טקסטים, להעלות תמונות ולנהל ביקורות. כל שמירה מתפרסמת לאתר תוך כדקה.

### שאלות נפוצות

- **החלפת סיסמה**: מריצים שוב את שלב 2 עם סיסמה חדשה ומעדכנים את `ADMIN_PASS_HASH` ב-Vercel (+Redeploy).
- **שכחתי סיסמה**: אותו דבר — פשוט קובעים חדשה.
- **הוספת משתמש נוסף**: כרגע מוגדר משתמש אחד. אפשר להרחיב בקלות אם תצטרכו.
- **התנתקות אוטומטית**: ההתחברות תקפה ל-8 שעות, אחר כך מתחברים שוב.

# Restro / kCodeIT — Login Credentials

All passwords are `password` unless noted otherwise.

---

## Super Admin (SaaS Control Panel)

| Route | Email | Password |
|-------|-------|----------|
| `/kcodeit` | `admin@kcode.it` | `password` |

---

## Restaurant Admin Logins

| Restaurant | Route | Email | Password |
|------------|-------|-------|----------|
| The Royal Clay Oven | `/portal` | `rest-1@admin.it` | `password` |
| Dakshin Delights | `/portal` | `rest-2@admin.it` | `password` |
| Chaat Chowk & Co. | `/portal` | `rest-3@admin.it` | `password` |
| The Dim Sum House | `/portal` | `rest-4@admin.it` | `password` |
| Pizzeria Gusto & Pasta | `/portal` | `rest-5@admin.it` | `password` |
| The Sweet Boutique | `/portal` | `rest-6@admin.it` | `password` |
| The Green Bowl Co. | `/portal` | `rest-7@admin.it` | `password` |

---

## Chef / Kitchen Display (KDS) Logins

| Restaurant | Route | Email | Password |
|------------|-------|-------|----------|
| The Royal Clay Oven | `/portal` | `rest-1@chef.it` | `password` |
| Dakshin Delights | `/portal` | `rest-2@chef.it` | `password` |
| Chaat Chowk & Co. | `/portal` | `rest-3@chef.it` | `password` |
| The Dim Sum House | `/portal` | `rest-4@chef.it` | `password` |
| Pizzeria Gusto & Pasta | `/portal` | `rest-5@chef.it` | `password` |
| The Sweet Boutique | `/portal` | `rest-6@chef.it` | `password` |
| The Green Bowl Co. | `/portal` | `rest-7@chef.it` | `password` |

---

## Dev Bypass (Works for ALL roles)

| Email | Password | Notes |
|-------|----------|-------|
| `admin@kcode.it` | `password` | Bypasses all auth on any portal. Use for quick testing. |

---

## Customer QR Code Routes (No login, PIN-based access)

| Restaurant | QR Route (Table 1) | PIN |
|------------|---------------------|-----|
| The Royal Clay Oven | `/r/rest-1/t/1` | `1234` |
| Dakshin Delights | `/r/rest-2/t/1` | `5678` |
| Chaat Chowk & Co. | `/r/rest-3/t/1` | `9999` |
| The Dim Sum House | `/r/rest-4/t/1` | `4444` |
| Pizzeria Gusto & Pasta | `/r/rest-5/t/1` | `5555` |
| The Sweet Boutique | `/r/rest-6/t/1` | `6666` |
| The Green Bowl Co. | `/r/rest-7/t/1` | `7777` |

> Replace `/t/1` with any table number (e.g. `/r/rest-1/t/5`).

---

## Quick Test URLs

```
Super Admin:     https://your-domain/kcodeit
Staff Portal:    https://your-domain/portal
Customer Menu:   https://your-domain/r/rest-1/t/1
Local Dev:       http://localhost:3001
```

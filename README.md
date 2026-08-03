# GenZeReal Full-Stack Setup

This package contains:

- `frontend/src/App.jsx` — your supplied React frontend, patched to use the API.
- `frontend/src/api.js` — API and JWT/localStorage helpers.
- `backend/` — Node.js + Express + MongoDB backend.
- MongoDB collections for users, login/logout history, wishlists and orders.
- Real order-confirmation email through SMTP/Nodemailer.

## 1. Software required

Install Node.js LTS, Git, and create free accounts on MongoDB Atlas and Gmail/another SMTP provider.

Check Git Bash:

```bash
node -v
npm -v
git --version
```

## 2. MongoDB Atlas connection

1. Create a MongoDB Atlas project and a free cluster.
2. In **Database Access**, create a database user and password.
3. In **Network Access**, add your current IP. For temporary development only, `0.0.0.0/0` permits access from anywhere.
4. Press **Connect → Drivers → Node.js** and copy the connection string.
5. Replace `<username>`, `<password>`, and the database name. URL-encode special password characters.

Example:

```env
MONGODB_URI=mongodb+srv://myuser:mypassword@cluster0.xxxxx.mongodb.net/genzereal?retryWrites=true&w=majority
```

Never place this value inside React code or upload `.env` to GitHub.

## 3. Configure and run the backend in Git Bash

From this package:

```bash
cd genzereal-fullstack/backend
cp .env.example .env
```

Open `.env` in VS Code or Notepad and enter your MongoDB, JWT and email values. Generate a JWT secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Then install and run:

```bash
npm install
npm run dev
```

Expected messages:

```text
MongoDB connected: ...
API running at http://localhost:5000
```

Test in your browser:

```text
http://localhost:5000/api/health
```

## 4. Configure your React frontend

Copy these files into your existing React/Vite project:

```text
frontend/src/App.jsx  -> your-project/src/App.jsx
frontend/src/api.js   -> your-project/src/api.js
```

Create `your-project/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

Run the frontend in a second Git Bash window:

```bash
cd path/to/your-react-project
npm install
npm run dev
```

The backend `.env` must contain:

```env
CLIENT_URL=http://localhost:5173
```

Use the exact frontend URL shown by Vite if it uses a different port.

## 5. Enable real Gmail confirmation emails

Do not use your normal Gmail password.

1. Turn on Google 2-Step Verification.
2. Create a Google **App Password** for Mail.
3. Put the generated 16-character password in backend `.env` without spaces:

```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=465
MAIL_SECURE=true
MAIL_USER=yourgmail@gmail.com
MAIL_PASS=abcdefghijklmnop
MAIL_FROM="GenZeReal <yourgmail@gmail.com>"
```

Restart the backend after changing `.env`.

For production, a transactional provider such as Resend, Postmark, Amazon SES, Brevo or SendGrid is usually more reliable than a personal Gmail account.

## 6. What is stored in MongoDB

### `users`

- Customer name and email
- Secure bcrypt password hash (not plain password)
- Wishlist product IDs
- Login and logout event history
- Last login/logout timestamps

### `orders`

- Customer and user reference
- Products, quantity, selected size and prices
- Total, order number, status and payment method
- Shipping address fields
- Whether confirmation email was sent and any email error

## 7. API endpoints

```text
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout       authenticated
GET    /api/auth/me           authenticated
GET    /api/wishlist          authenticated
POST   /api/wishlist/:id      authenticated
DELETE /api/wishlist/:id      authenticated
POST   /api/orders            authenticated
GET    /api/orders/mine       authenticated
```

The frontend sends a JWT in:

```text
Authorization: Bearer <token>
```

## 8. Important checkout improvement

Your original design has no size or shipping-address form. The included backend accepts `size` and address fields, but the patched frontend currently sends:

```text
size: "Not selected"
shippingAddress.country: "India"
```

Before accepting real paid orders, add a checkout form for size, phone number, complete address, postcode and payment selection. Also calculate prices on the server from a products collection instead of trusting prices sent by the browser.

## 9. Common errors

### MongoDB authentication failed

Check username/password, URL-encode special characters, and confirm Atlas Network Access.

### CORS error

Set `CLIENT_URL` to the exact frontend origin, then restart the backend.

### Email is not sent

Check Google App Password, 2-Step Verification and SMTP values. The order is still stored; `emailError` records the failure.

### `Failed to fetch`

Confirm the backend is running, `VITE_API_URL` is correct, and restart Vite after editing frontend `.env`.

## 10. Production safety checklist

- Keep `.env` private and add it to `.gitignore`.
- Use HTTPS.
- Use a long JWT secret.
- Restrict MongoDB Network Access.
- Validate complete checkout data.
- Store products and authoritative prices in MongoDB.
- Add payment gateway verification before marking paid orders confirmed.
- Consider httpOnly secure cookies instead of localStorage JWT for a hardened production setup.

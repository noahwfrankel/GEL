# GEL

Discover your style through your music.

## Run the app

**Option A — Production (most reliable)**  
Build once, then start the server:

```bash
cd /Users/noahfrankel/Documents/gel
npm run build
npm run start
```

Then open in your browser: **http://127.0.0.1:3000**

**Option B — One command**  
Same as above in one step:

```bash
cd /Users/noahfrankel/Documents/gel
npm run serve
```

Then open: **http://127.0.0.1:3000**

**Option C — Dev mode** (with hot reload):

```bash
cd /Users/noahfrankel/Documents/gel
npm run dev
```

Then open **http://localhost:3000** (or your HTTPS URL if you handle SSL yourself).

---

## If you see "Connection failed"

1. **Use a normal browser** — Open Chrome, Safari, or Firefox and go to your app URL (not Cursor’s built-in preview).
2. **Try production** — If dev fails, run `npm run build` then `npm run start` and open **http://127.0.0.1:3000**.
3. **Port in use** — If something else is using port 3000, run on another port:
   ```bash
   npx next start --hostname 127.0.0.1 --port 3001
   ```
   Then open **http://127.0.0.1:3001**.

---

## Spotify login

1. Create an app at [Spotify for Developers](https://developer.spotify.com/dashboard) and copy the **Client ID**.
2. In the app settings, add **https://localhost:3000/callback** to **Redirect URIs** (HTTPS so Spotify treats it as secure).
3. In the project root, copy `.env.example` to `.env` and set:
   ```bash
   NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your_client_id
   ```
4. Set `NEXT_PUBLIC_SPOTIFY_REDIRECT_URI=https://localhost:3000/callback` in `.env`. Run the app with `npm run dev` and open it (accept the SSL warning if you use HTTPS). Click **Log in with Spotify**.

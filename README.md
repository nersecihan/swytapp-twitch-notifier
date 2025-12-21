# Twitch → Slack Stream Notifier

A lightweight Node.js worker that monitors Twitch for live streams of a specific game and sends Slack notifications when new streamers go live.

We originally built and used this tool for our project **The Floor Above** to quickly jump into conversations with streamers as soon as they went live. This helped us build a strong streamer community and gain additional wishlists through real-time engagement.

🔗 **Steam demo:** [The Floor Above Demo](https://store.steampowered.com/app/4031420/The_Floor_Above_Demo/)

This tool is useful for:
- indie game developers
- marketing and community teams
- tracking organic Twitch coverage in real time
- quickly engaging with streamers when they start broadcasting your game

---

## Getting the Twitch Game ID

### 1. Get an App Access Token

```bash
curl -X POST "https://id.twitch.tv/oauth2/token" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "grant_type=client_credentials"
```

### 2. Find the game by name

Replace `GAME_NAME` with your game title (URL-encoded).

```bash
curl -X GET "https://api.twitch.tv/helix/games?name=GAME_NAME" \
  -H "Client-ID: YOUR_CLIENT_ID" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Example response

```json
{
  "data": [
    {
      "id": "123456789",
      "name": "Your Game Name"
    }
  ]
}
```

Use the `id` value as `TWITCH_GAME_ID`.

---

## Running locally

```bash
node index.js
```

### Expected logs

```text
🚀 Starting Twitch → Slack notifier…
✅ Sent Slack startup message
Checked Twitch: 0 live streams for the selected game.
```

---

## Slack message format

### Startup message

```text
🚀 Twitch notifier started
Server is up and watching for streams.
```

### New stream detected

```text
🎮 A new stream just went live!
Streamer: STREAMER_NAME
Viewers: VIEWER_COUNT
Title: STREAM_TITLE
Link: https://twitch.tv/STREAMER_LOGIN
```

---

## Deployment (Heroku – recommended)

This app is a **background worker**, not a web server.

### Procfile

```Procfile
worker: npm start
```

### Heroku steps (high-level)

1. Create a Heroku app
2. Set environment variables in:
   - **Settings → Reveal Config Vars**
3. Enable the **worker** dyno
4. Disable the **web** dyno
5. Deploy via Git or GitHub integration

---

## Notes & Limitations

- Live streamer state is stored **in memory**
- Restarting the app may resend notifications for streams that are already live
- Twitch API rate limits apply
- Polling every **1–5 minutes** is generally safe
- For persistence across restarts, use Redis or a database

---

## Security Notes

- ❌ Do not commit `.env`
- ❌ Do not commit `node_modules`
- ❌ Do not expose Slack webhooks or Twitch secrets
- ✅ `package-lock.json` is safe and recommended

---

## Repository Hygiene

Recommended files:

```text
.
├── index.js
├── package.json
├── package-lock.json
├── Procfile
├── README.md
├── .env.example
└── .gitignore
```

---

## License

MIT (or your preferred license)

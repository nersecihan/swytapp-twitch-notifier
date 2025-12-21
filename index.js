import dotenv from "dotenv";
import fetch from "node-fetch";
import cron from "node-cron";

dotenv.config();

const {
  TWITCH_CLIENT_ID,
  TWITCH_CLIENT_SECRET,
  TWITCH_GAME_ID,
  SLACK_WEBHOOK_URL,
  POLL_INTERVAL_MINUTES = 2,
} = process.env;

let appAccessToken = null;
let knownLiveStreamers = new Set();

// --------------------------------------------
// Send Slack message when server starts
// --------------------------------------------
async function notifySlackStartup() {
  const payload = {
    text: "🚀 TFA Twitch notifier started\nServer is up and watching for streams.",
  };

  const res = await fetch(SLACK_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    console.error(
      "Failed to send Slack startup message",
      res.status,
      await res.text()
    );
  } else {
    console.log("✅ Sent Slack startup message");
  }
}

// --------------------------------------------
// 1) Get Twitch App Access Token
// --------------------------------------------
async function getTwitchAccessToken() {
  const url = new URL("https://id.twitch.tv/oauth2/token");
  url.searchParams.set("client_id", TWITCH_CLIENT_ID);
  url.searchParams.set("client_secret", TWITCH_CLIENT_SECRET);
  url.searchParams.set("grant_type", "client_credentials");

  const res = await fetch(url, { method: "POST" });
  if (!res.ok) {
    console.error("Failed to get Twitch token", res.status, await res.text());
    throw new Error("Twitch token error");
  }
  const data = await res.json();
  appAccessToken = data.access_token;
  console.log("✅ Got Twitch app access token");
}

// --------------------------------------------
// 2) Fetch live streams by game_id
// --------------------------------------------
async function fetchStreamsByGame() {
  if (!appAccessToken) {
    await getTwitchAccessToken();
  }

  const url = new URL("https://api.twitch.tv/helix/streams");
  url.searchParams.set("game_id", TWITCH_GAME_ID);
  url.searchParams.set("type", "live");
  url.searchParams.set("first", "50");

  const res = await fetch(url, {
    headers: {
      "Client-ID": TWITCH_CLIENT_ID,
      "Authorization": `Bearer ${appAccessToken}`,
    },
  });

  if (res.status === 401) {
    console.warn("Twitch token expired, refreshing…");
    await getTwitchAccessToken();
    return fetchStreamsByGame();
  }

  if (!res.ok) {
    console.error("Failed to fetch streams", res.status, await res.text());
    throw new Error("Twitch streams error");
  }

  const data = await res.json();
  return data.data || [];
}

// --------------------------------------------
// 3) Send Slack notification about stream
// --------------------------------------------
async function notifySlack(stream) {
  const payload = {
    text:
      `👻 A new The Floor Above stream just went live!\n` +
      `Streamer: ${stream.user_name}\n` +
      `Viewers: ${stream.viewer_count}\n` +
      `Title: ${stream.title}\n` +
      `Link: https://twitch.tv/${stream.user_login}`,
  };

  const res = await fetch(SLACK_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    console.error("Failed to send Slack message", res.status, await res.text());
  } else {
    console.log(`✅ Notified Slack about ${stream.user_name}`);
  }
}

// --------------------------------------------
// 4) Main watcher logic
// --------------------------------------------
async function checkTFAStreams() {
  try {
    const streams = await fetchStreamsByGame();
    const currentLive = new Set();

    for (const s of streams) {
      currentLive.add(s.user_id);

      if (!knownLiveStreamers.has(s.user_id)) {
        await notifySlack(s);
      }
    }

    knownLiveStreamers = currentLive;

    console.log(
      `Checked Twitch: ${streams.length} live streams for The Floor Above.`
    );
  } catch (err) {
    console.error("Error during Twitch check:", err);
  }
}

// --------------------------------------------
// 5) Start server
// --------------------------------------------
console.log("🚀 Starting TFA Twitch → Slack notifier…");

// SEND STARTUP MESSAGE
notifySlackStartup();

// Run initial check
checkTFAStreams();

// Schedule repeated checks
const cronExpr = `*/${POLL_INTERVAL_MINUTES} * * * *`;
cron.schedule(cronExpr, checkTFAStreams);

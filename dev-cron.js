// Simple local cron runner for development
// Run this with: node dev-cron.js
// Press Ctrl+C to stop

const CRON_SECRET = "41d62ef11a12e5eb4e8b7b38c9ec0de5de66e2d5f992a2baa5dc7480c7a6ee75";
const API_BASE = "http://localhost:3000";

async function runQueueProcessor() {
  try {
    console.log("🚀 Processing queue...");
    
    const response = await fetch(`${API_BASE}/api/queue/process`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cron-secret": CRON_SECRET,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("❌ Failed to process queue:", error);
      return;
    }

    console.log("✅ Queue processed successfully");
  } catch (error) {
    console.error("❌ Error processing queue:", error);
  }
}

// Run every 10 seconds for testing
let count = 0;
setInterval(() => {
  count++;
  console.log(`\n[${new Date().toISOString()}] Run #${count}`);
  runQueueProcessor();
}, 10000);

console.log("📡 Local cron runner started... (will process queue every 10 seconds)");
console.log("   Press Ctrl+C to stop\n");
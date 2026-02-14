// test-gas-endpoint.js
const https = require("https");
const url = require("url");

const target = "https://script.google.com/macros/s/AKfycbzo1AmTq2nQF5PVWn5Kbx35sZrqaeSOo3c7FKgiqLGmB9fZkONtlBQQVIITGRtgifDVAQ/exec?action=getEmployees";

function fetchOnce(u) {
  return new Promise((resolve, reject) => {
    const parsed = url.parse(u);
    const opts = {
      hostname: parsed.hostname,
      path: parsed.path,
      method: "GET",
      headers: { "User-Agent": "node-fetch-test" }
    };
    const req = https.request(opts, res => {
      let body = "";
      res.on("data", d => (body += d));
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body, location: res.headers.location }));
    });
    req.on("error", reject);
    req.end();
  });
}

(async () => {
  try {
    console.log("Requesting:", target);
    let current = target;
    for (let i = 0; i < 5; i++) {
      const r = await fetchOnce(current);
      console.log(`\n--- Response ${i+1} ---`);
      console.log("URL:", current);
      console.log("Status:", r.status);
      console.log("Location header:", r.location || "(none)");
      console.log("Content-Type:", r.headers["content-type"] || "(none)");
      console.log("Body (first 1000 chars):\n", r.body.slice(0, 1000));
      if (!r.location || r.status === 200) break;
      current = r.location;
    }
  } catch (err) {
    console.error("ERROR:", err);
  }
})();
const jwt = require("jsonwebtoken");
const fetch = require("node-fetch");
require("dotenv").config({ path: ".env" });

async function run() {
  const token = jwt.sign({ userId: 1, email: "test@example.com" }, process.env.JWT_SECRET || "fallback_secret", { expiresIn: "1h" });
  
  const res = await fetch("http://localhost:4000/api/schedule/history", {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  const body = await res.text();
  console.log("Status:", res.status);
  console.log("Body:", body.substring(0, 500));
}

run();

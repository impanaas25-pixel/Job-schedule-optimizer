// ═══════════════════════════════════════════════════════════
//  NODEMAILER — Email Notification Transport
//  Sends project confirmation and waitlist alert emails.
//  If SMTP credentials are absent, all sends are silently
//  skipped so the optimizer endpoint never fails because of
//  a missing mail configuration.
// ═══════════════════════════════════════════════════════════
require("dotenv").config();
const nodemailer = require("nodemailer");

// Build transport only when credentials are present
let transport = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const FROM = process.env.MAIL_FROM || "StudioYield <noreply@studioyield.app>";

// ── Helpers ──────────────────────────────────────────────────

/**
 * Send a project schedule confirmation to the client.
 * @param {string} toEmail  — recipient address
 * @param {string} projectName
 * @param {number} scheduledDay
 * @param {number} contractValue
 */
async function sendConfirmation(toEmail, projectName, scheduledDay, contractValue) {
  if (!transport) return;
  try {
    await transport.sendMail({
      from: FROM,
      to: toEmail,
      subject: `✅ StudioYield: "${projectName}" Confirmed for Day ${scheduledDay}`,
      html: `
        <div style="font-family:'Inter',sans-serif;max-width:520px;margin:0 auto;background:#faf8f5;border:1px solid #e8e0d8;border-radius:6px;padding:32px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px;">
            <div style="width:32px;height:32px;background:linear-gradient(168deg,hsl(14,42%,56%),hsl(8,52%,44%));border-radius:4px;display:flex;align-items:center;justify-content:center;">
              <span style="color:#fdf9f5;font-size:16px;">✦</span>
            </div>
            <span style="font-family:'Georgia',serif;font-weight:700;font-size:18px;color:#2a2a28;">StudioYield</span>
          </div>
          <h2 style="font-family:'Georgia',serif;color:#2a2a28;font-size:22px;margin:0 0 8px;">Project Scheduled ✓</h2>
          <p style="color:#6b6458;font-size:14px;margin:0 0 24px;">Your project has been allocated a production slot this week.</p>
          <div style="background:#fff;border:1px solid #e8e0d8;border-radius:4px;padding:20px;margin-bottom:24px;">
            <p style="font-family:'Georgia',serif;font-weight:700;color:#2a2a28;font-size:16px;margin:0 0 4px;">${projectName}</p>
            <p style="color:#6b6458;font-size:13px;margin:0 0 12px;">Scheduled for <strong>Day ${scheduledDay}</strong></p>
            <p style="font-size:20px;font-family:'Georgia',serif;font-weight:700;color:hsl(8,51%,47%);margin:0;">₹${contractValue.toLocaleString("en-IN")}</p>
          </div>
          <p style="color:#a09485;font-size:12px;margin:0;">This is an automated notification from StudioYield Optimizer.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Mail send error (confirmation):", err.message);
  }
}

/**
 * Send a polite peak-capacity alert for waitlisted projects.
 * @param {string} toEmail
 * @param {string} projectName
 * @param {number} contractValue
 */
async function sendWaitlistAlert(toEmail, projectName, contractValue) {
  if (!transport) return;
  try {
    await transport.sendMail({
      from: FROM,
      to: toEmail,
      subject: `⏳ StudioYield: "${projectName}" Waitlisted — Capacity Full`,
      html: `
        <div style="font-family:'Inter',sans-serif;max-width:520px;margin:0 auto;background:#faf8f5;border:1px solid #e8e0d8;border-radius:6px;padding:32px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px;">
            <div style="width:32px;height:32px;background:linear-gradient(168deg,hsl(14,42%,56%),hsl(8,52%,44%));border-radius:4px;display:flex;align-items:center;justify-content:center;">
              <span style="color:#fdf9f5;font-size:16px;">✦</span>
            </div>
            <span style="font-family:'Georgia',serif;font-weight:700;font-size:18px;color:#2a2a28;">StudioYield</span>
          </div>
          <h2 style="font-family:'Georgia',serif;color:#2a2a28;font-size:22px;margin:0 0 8px;">Peak Capacity — Waitlisted</h2>
          <p style="color:#6b6458;font-size:14px;margin:0 0 24px;">We were unable to allocate a production slot for one of your projects this cycle. It has been added to the Smart Backlog.</p>
          <div style="background:#faebe6;border:1px solid #f3cfc4;border-radius:4px;padding:20px;margin-bottom:24px;">
            <p style="font-family:'Georgia',serif;font-weight:700;color:#9a3412;font-size:16px;margin:0 0 4px;">${projectName}</p>
            <p style="color:#9a3412;font-size:13px;margin:0 0 12px;">Status: <strong>Waitlisted</strong></p>
            <p style="font-size:16px;font-family:'Georgia',serif;font-weight:700;color:#9a3412;margin:0;">₹${contractValue.toLocaleString("en-IN")} — held in backlog</p>
          </div>
          <p style="color:#6b6458;font-size:13px;margin:0 0 8px;">This project will be first in line when capacity opens next week. No action needed from your end.</p>
          <p style="color:#a09485;font-size:12px;margin:0;">This is an automated notification from StudioYield Optimizer.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Mail send error (waitlist):", err.message);
  }
}

module.exports = { sendConfirmation, sendWaitlistAlert };

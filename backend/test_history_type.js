const pool = require("./src/db");
async function run() {
  const result = await pool.query("SELECT * FROM schedule_history LIMIT 1");
  if (result.rows.length > 0) {
    const row = result.rows[0];
    console.log("accepted_json type:", typeof row.accepted_json);
    console.log("Is array?", Array.isArray(row.accepted_json));
  }
  process.exit(0);
}
run();

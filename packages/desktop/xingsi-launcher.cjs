// Establish the branded data root before evaluating any bundled ES module.
const { join } = require("node:path");
const { homedir } = require("node:os");
process.env.ZCODE_DATA_BASE_DIR =
  process.env.XINGSI_DATA_BASE_DIR?.trim() ||
  join(process.env.LOCALAPPDATA || homedir(), "XingsiTianji");
import("./out/main/index.js").catch((error) => {
  console.error("星际中转站启动失败", error);
  process.exitCode = 1;
});

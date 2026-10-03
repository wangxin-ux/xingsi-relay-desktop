import { homedir } from "node:os";
import { join } from "node:path";

// 品牌发行版必须先隔离数据根，再导入会捕获数据路径的业务模块。
process.env.ZCODE_DATA_BASE_DIR =
  process.env.XINGSI_DATA_BASE_DIR?.trim() ||
  join(process.env.LOCALAPPDATA || homedir(), "XingsiTianji");

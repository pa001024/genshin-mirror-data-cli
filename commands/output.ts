import fs from "fs-extra";

export async function run() {
  await fs.copy("dist", "../genshin-mirror/content", { overwrite: true, recursive: true });
}

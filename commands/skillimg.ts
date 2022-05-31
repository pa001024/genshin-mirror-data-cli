import axios from "axios";
import consola from "consola";
import fs from "fs-extra";
import { snakeCase, startCase } from "lodash";
import { ArtifactType } from "../../genshin-mirror/modules/core/enum";
import { IAvatar } from "../../genshin-mirror/modules/core/interface";

// extra
import { affixMap, DATA_DIR, toID, toText } from "../util";

export async function run() {
  // await fs.emptyDir("dist/item");

  await parseSkillImg();
}

async function parseSkillImg() {
  const fl = await fs.readdir("dist/en/char/");

  const data: IAvatar[] = fl.map(v => fs.readJSONSync(`dist/en/char/${v}`));

  const items: { name: string; type: string; char: string }[] = [].concat(
    ...(data.map(a => {
      return [
        // -
        { name: a.attackSkill?.name, type: "skill", char: a.name },
        { name: a.elemSkill?.name, type: "skill", char: a.name },
        { name: a.elemBurst?.name, type: "skill", char: a.name },
        ...(a.talents?.map(v => ({ name: v.name, type: "talent", char: a.name })) || []),
        ...(a.c13ns?.map(v => ({ name: v.name, type: "talent", char: a.name })) || []),
      ].filter(v => v && v.name);
    }) as any)
  );
  await fs.ensureDir("tmp/skill");
  const TH = 4;
  for (let i = 0; i < items.length; i += TH) {
    const job = async (item: typeof items[number]) => {
      const sid = item.name
        .split(/\s+/g)
        .map(v => startCase(v))
        .join("")
        .replace(/\W+/g, "");
      const fn = `tmp/skill/${sid}.png`;
      // skip existed files
      if (await fs.pathExists(fn)) return;

      const urls = (v: string | number) => {
        return [`https://genshin.honeyhunterworld.com/img/skills/s_${v}.png`];
      };
      let noitem = true;
      for (const url of urls(id)) {
        const isOK = await axios.head(url, { timeout: 5e3 }).catch(() => {});
        if (isOK) {
          const file = await axios.get(url, { responseType: "arraybuffer" });
          await fs.writeFile(fn, file.data);
          consola.success(`write ${id}.png`);
          noitem = false;
          break;
        }
      }
      if (noitem) {
        consola.error(`not found ${item.type}: ${item.name} in ${item.char} (${id})`);
      }
    };
    const jobfiles = items.slice(i, i + TH);
    await Promise.all(jobfiles.map(job));
  }

  return;
}

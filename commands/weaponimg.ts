import axios from "axios";
import consola from "consola";
import fs from "fs-extra";
import { JSDOM } from "jsdom";
import { startCase } from "lodash";

// extra

export async function run() {
  // await fs.emptyDir("dist/item");

  await parseWeaponImg();
}

interface WeaponDBResult {
  id: string;
  name: string;
}

async function parseWeaponImg() {
  let items: WeaponDBResult[] = [];

  if (await fs.pathExists("tmp/weapon/items.json")) {
    const file = await fs.readJson("tmp/weapon/items.json");
    items = file;
  } else {
    const listUrls = [
      "https://genshin.honeyhunterworld.com/db/weapon/sword/?lang=EN",
      "https://genshin.honeyhunterworld.com/db/weapon/claymore/?lang=EN",
      "https://genshin.honeyhunterworld.com/db/weapon/polearm/?lang=EN",
      "https://genshin.honeyhunterworld.com/db/weapon/bow/?lang=EN",
      "https://genshin.honeyhunterworld.com/db/weapon/catalyst/?lang=EN",
    ];

    for (const url of listUrls) {
      let rst;
      while (!rst) {
        rst = await axios.get(url, { timeout: 3e3 }).catch(e => consola.error(e));
        if (!rst) consola.error(`get ${url} failed`);
        else consola.success(`load ${url} items`);
      }
      const dom = new JSDOM(rst.data);
      const $ = require("jquery")(dom.window);
      const data: WeaponDBResult[] = [].map.call($(".post table tr:not(:first) > td:nth-child(3)"), v => ({
        name: $(v).text(),
        id: $(v).prev().find("img").attr("data-src"),
      })) as any;
      items.push(...data);
    }
    await fs.writeFile("tmp/weapon/items.json", JSON.stringify(items));
  }

  consola.success(`load ${items.length} items`);

  await fs.ensureDir("tmp/weapon/full");

  const TH = 4;
  for (let i = 0; i < items.length; i += TH) {
    const job = async (item: typeof items[number]) => {
      const sid = item.name
        .split(/\s+/g)
        .map(v => startCase(v))
        .join("")
        .replace(/\W+/g, "");
      const fn = `tmp/weapon/full/${sid}.png`;
      // skip existed files
      if ((await fs.pathExists(fn)) || !item.id) return;

      const urls = (v: string) => {
        return [`https://genshin.honeyhunterworld.com${v.replace(/_35/, "")}`];
      };
      let noitem = true;
      for (const url of urls(item.id)) {
        let file = await axios.get(url, { timeout: 3e3, responseType: "arraybuffer" }).catch(e => consola.error(e));
        if (!file) break;
        await fs.writeFile(fn, file.data);
        consola.success(`write ${sid}.png`);
        noitem = false;
        break;
      }
      if (noitem) {
        consola.error(`not found ${item.name}`);
      }
    };
    const jobfiles = items.slice(i, i + TH);
    await Promise.all(jobfiles.map(job));
  }

  return;
}

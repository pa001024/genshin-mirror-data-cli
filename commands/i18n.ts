import fs from "fs-extra";
import { cloneDeep, flatten, get, groupBy, keyBy, keys, map, set } from "lodash";
import { BuffType } from "../../genshin-mirror/modules/core/enum";

// extra
import { DATA_DIR, Dict, saveObject, toAttrType, toNum, locales, toText } from "../util";

const DIR = "../genshin-mirror/locales/";
let reverseCN: Map<string, number>;

export async function run() {
  reverseCN = new Map<string, number>(map(fs.readJsonSync(DATA_DIR + "TextMap/TextZHS.json"), (v: string, k: number) => [v, k]).filter(v => v[0]) as any);
  await fs.emptyDir("dist/i18n");
  await parseI18n();
}

async function parseI18n() {
  const source = await fs.readJson(DIR + "zh-Hans.json");
  const pairs: [string, string][] = flatten(
    map(source, (v, k) => {
      return map(v, (v2, k2) => {
        return [k + "." + k2, v2] as [string, string];
      });
    })
  );
  const nmap = pairs.reduce<Dict>((r, v) => ((r[v[0]] = v[1]), r), {});

  await saveObject("i18n", "en.json", await translateLocale("en", cloneDeep(source), nmap), { printWidth: 20 });
  await saveObject("i18n", "ja.json", await translateLocale("ja", cloneDeep(source), nmap), { printWidth: 20 });
  await saveObject("i18n", "zh-Hant.json", await translateLocale("zh-Hant", cloneDeep(source), nmap), { printWidth: 20 });
}

async function translateLocale(locale: string, dist: any, source: Dict) {
  const ref = await fs.readJson(DIR + locale + ".json");
  // const pairs = flatten(
  //   map(dist, (v, k) => {
  //     return map(v, (v2, k2) => {
  //       return [k + "." + k2, v2];
  //     });
  //   })
  // );
  map(source, (ori, key) => {
    const rst = translateText(ori, locale);
    if (rst) {
      set(dist, key, rst);
    } else {
      const translated = get(ref, key);
      set(dist, key, translated || "");
    }
  });
  return dist;
}

export function translateText(str: string, lang = "en") {
  if (!reverseCN.get(str)) return "";
  return toText(reverseCN.get(str)!, lang);
}

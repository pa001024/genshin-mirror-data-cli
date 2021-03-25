import axios from "axios";
import consola from "consola";
import fs from "fs-extra";
import { snakeCase } from "lodash";
import { ArtifactType } from "../../genshin-mirror/modules/core/enum";

// extra
import { affixMap, DATA_DIR, toID, toText } from "../util";

export async function run() {
  // await fs.emptyDir("dist/item");

  await parseRelicImg();
}

async function parseRelicImg() {
  interface ReliquarySetExcelConfigData {
    SetId: number;
    SetIcon: string;
    SetNeedNum: number[];
    EquipAffixId: number;
    ContainsList: number[];
    DisableFilter?: number;
  }
  const data: ReliquarySetExcelConfigData[] = await fs.readJSON(DATA_DIR + "ExcelBinOutput/ReliquarySetExcelConfigData.json");
  interface ReliquaryExcelConfigData {
    EquipType: string;
    ShowPic: string;
    MainPropDepotId: number;
    AppendPropDepotId: number;
    AddPropLevels: number[];
    BaseConvExp: number;
    MaxLevel: number;
    DestroyReturnMaterial: number[];
    DestroyReturnMaterialCount: number[];
    Id: number;
    NameTextMapHash: any;
    DescTextMapHash: any;
    Icon: string;
    ItemType: string;
    Weight: number;
    Rank: number;
    GadgetId: number;
    RankLevel?: number;
    AppendPropNum?: number;
    SetId?: number;
    StoryId?: number;
    DestroyRule: string;
    InitialLockState?: number;
    Dropable?: boolean;
  }
  const relics: ReliquaryExcelConfigData[] = await fs.readJSON(DATA_DIR + "ExcelBinOutput/ReliquaryExcelConfigData.json");
  const relicMap = relics.reduce<{ [x: number]: ReliquaryExcelConfigData }>((r, v) => (r[v.Id] = v) && r, {});

  const items = data
    .filter(v => v.EquipAffixId)
    .map(v => {
      const affix = toAffix(v.EquipAffixId);
      return { ...v, affix };
    });
  function toAffix(id: number) {
    const affixLevels = affixMap[id];
    const affix = affixLevels[0];
    return affix;
  }
  const partMap: { [x: string]: number } = {
    EQUIP_BRACER: ArtifactType.FlowerOfLife,
    EQUIP_NECKLACE: ArtifactType.PlumeOfDeath,
    EQUIP_SHOES: ArtifactType.SandsOfEon,
    EQUIP_RING: ArtifactType.GobletOfEonothem,
    EQUIP_DRESS: ArtifactType.CircletOfLogos,
  };
  const urlMap: { [x: string]: number } = {
    EQUIP_BRACER: 4,
    EQUIP_NECKLACE: 2,
    EQUIP_SHOES: 5,
    EQUIP_RING: 1,
    EQUIP_DRESS: 3,
  };
  await fs.ensureDir("tmp/relic");
  const TH = 4;
  for (let i = 0; i < items.length; i += TH) {
    const job = async (item: typeof items[number]) => {
      const id = toID(item.affix.NameTextMapHash);
      const subItems = item.ContainsList.map(v => relicMap[v]);
      for (const sub of subItems) {
        const sid = `${id}_${partMap[sub.EquipType]}`;
        const uid = `${id}_${urlMap[sub.EquipType]}`;
        const fn = `tmp/relic/${sid}.png`;
        // skip existed files
        if (await fs.pathExists(fn)) return;

        const urls = (v: string) => {
          v = v.replace("Traveling", "Travelling");
          v = v.replace("BlizzardStrayer", "Blizzard_walker");
          v = v.replace("HeartOfDepth", "Depth_of_heart");
          v = v.replace("PrayersFor", "PrayersOf");
          v = v.replace("PrayersTo", "PrayersOf");
          const v2 = v.replace("_3", "_4");
          return [
            `https://genshin.honeyhunterworld.com/img/art/${snakeCase(v)}_70.png`,
            `https://genshin.honeyhunterworld.com/img/art/${snakeCase(v2)}_70.png`,
          ];
        };
        let noitem = true;
        for (const url of urls(uid)) {
          const isOK = await axios.head(url, { timeout: 5e3 }).catch(() => {});
          if (isOK) {
            const file = await axios.get(url, { responseType: "arraybuffer" });
            await fs.writeFile(fn, file.data);
            consola.success(`write ${sid}.png`);
            noitem = false;
            break;
          }
        }
        if (noitem) {
          consola.error(`not found ${sid}.png`);
        }
      }
    };
    const jobfiles = items.slice(i, i + TH);
    await Promise.all(jobfiles.map(job));
  }

  return;
}

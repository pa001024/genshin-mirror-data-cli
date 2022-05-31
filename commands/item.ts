import fs from "fs-extra";
import { keyBy, uniqBy } from "lodash";
import { MaterialType } from "../../genshin-mirror/modules/core/enum";
import { IItem } from "../../genshin-mirror/modules/core/interface";

// extra
import { DATA_DIR, saveTranslation, toDesc, toID, toText } from "../util";

export async function run() {
  // await fs.emptyDir("dist/item");

  await parseMaterial();
}

async function parseMaterial() {
  interface MaterialExcelConfigData {
    interactionTitleTextMapHash: number;
    noFirstGetHint?: boolean;
    itemUse: ItemUse[];
    rankLevel: number;
    effectDescTextMapHash: number;
    specialDescTextMapHash: number;
    typeDescTextMapHash: number;
    effectIcon: string;
    effectName: string;
    picPath: any[];
    satiationParams: any[];
    destroyReturnMaterial: any[];
    destroyReturnMaterialCount: any[];
    id: number;
    nameTextMapHash: number;
    descTextMapHash: number;
    icon: string;
    itemType: string;
    rank?: number;
    effectGadgetId?: number;
    materialType?: string;
    gadgetId?: number;
    stackLimit?: number;
  }

  interface Jump {}

  interface MaterialSourceDataExcelConfigData {
    id: number;
    name: string;
    dungeon: number[];
    jump: Jump[];
    textList: number[];
  }

  interface ItemUse {
    useParam: string[];
  }
  const data: MaterialExcelConfigData[] = await fs.readJSON(DATA_DIR + "ExcelBinOutput/MaterialExcelConfigData.json");
  const srcData: MaterialSourceDataExcelConfigData[] = await fs.readJSON(DATA_DIR + "ExcelBinOutput/MaterialSourceDataExcelConfigData.json");
  const srcMap = keyBy(srcData, "Id");

  await saveTranslation("item", "item.json", t => {
    const rst = data
      .filter(v => {
        if (v.id === 110000) return false;
        if (v.materialType && v.materialType in MaterialType) {
          const cnName = toText(v.nameTextMapHash, "zh-Hans");
          const cnType = toText(v.typeDescTextMapHash, "zh-Hans");
          if (!cnType || cnName.includes("（废弃）") || cnName.includes("(test)") || cnName.includes("（test）")) return false;
          return true;
        }
        return false;
      })
      .map(v => {
        const src = srcMap[v.id];
        const drop = src?.textList.map(t).filter(Boolean);
        const item: IItem = {
          uid: v.id,
          id: toID(v.nameTextMapHash),
          name: toText(v.nameTextMapHash),
          localeName: t(v.nameTextMapHash),
          desc: toDesc(t(v.descTextMapHash)),
          rarity: v.rankLevel || 1,
          type: MaterialType[v.materialType as any] as any as MaterialType,
          typeText: t(v.typeDescTextMapHash),
          drop: drop && drop.length ? drop : undefined,
        };
        return item;
      });
    return uniqBy(rst, "id");
  });
}

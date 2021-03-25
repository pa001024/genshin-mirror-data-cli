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
    InteractionTitleTextMapHash: number;
    NoFirstGetHint?: boolean;
    ItemUse: ItemUse[];
    RankLevel: number;
    EffectDescTextMapHash: number;
    SpecialDescTextMapHash: number;
    TypeDescTextMapHash: number;
    EffectIcon: string;
    EffectName: string;
    PicPath: any[];
    SatiationParams: any[];
    DestroyReturnMaterial: any[];
    DestroyReturnMaterialCount: any[];
    Id: number;
    NameTextMapHash: number;
    DescTextMapHash: number;
    Icon: string;
    ItemType: string;
    Rank?: number;
    EffectGadgetId?: number;
    MaterialType?: string;
    GadgetId?: number;
    StackLimit?: number;
  }

  interface Jump {}

  interface MaterialSourceDataExcelConfigData {
    Id: number;
    Name: string;
    Dungeon: number[];
    Jump: Jump[];
    TextList: number[];
  }

  interface ItemUse {
    UseParam: string[];
  }
  const data: MaterialExcelConfigData[] = await fs.readJSON(DATA_DIR + "ExcelBinOutput/MaterialExcelConfigData.json");
  const srcData: MaterialSourceDataExcelConfigData[] = await fs.readJSON(DATA_DIR + "ExcelBinOutput/MaterialSourceDataExcelConfigData.json");
  const srcMap = keyBy(srcData, "Id");

  await saveTranslation("item", "item.json", t => {
    const rst = data
      .filter(v => {
        if (v.Id === 110000) return false;
        if (v.MaterialType && v.MaterialType in MaterialType) {
          const cnName = toText(v.NameTextMapHash, "zh-Hans");
          const cnType = toText(v.TypeDescTextMapHash, "zh-Hans");
          if (!cnType || cnName.includes("（废弃）") || cnName.includes("(test)") || cnName.includes("（test）")) return false;
          return true;
        }
        return false;
      })
      .map(v => {
        const src = srcMap[v.Id];
        const drop = src.TextList.map(t).filter(Boolean);
        const item: IItem = {
          id: toID(v.NameTextMapHash),
          name: toText(v.NameTextMapHash),
          localeName: t(v.NameTextMapHash),
          desc: toDesc(t(v.DescTextMapHash)),
          rarity: v.RankLevel || 1,
          type: (MaterialType[v.MaterialType as any] as any) as MaterialType,
          typeText: t(v.TypeDescTextMapHash),
          drop: drop.length ? drop : undefined,
        };
        return item;
      });
    return uniqBy(rst, "id");
  });
}

import axios from "axios";
import consola from "consola";
import fs from "fs-extra";
import { snakeCase } from "lodash";

// extra
import { DATA_DIR, toID, toText } from "../util";

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

  interface ItemUse {
    UseParam: string[];
  }
  const data: MaterialExcelConfigData[] = await fs.readJSON(DATA_DIR + "ExcelBinOutput/MaterialExcelConfigData.json");

  const enabled: { [x: string]: (id: string) => string[] } = {
    [MaterialType.MATERIAL_AVATAR_MATERIAL]: (id: string) => {
      id = id.replace("Teachings", "Teaching");
      id = id.replace("CrownOfInsight", "crown_of_sagehood");
      id = id.replace("ShardOfAFoulLegacy", "ShardOfFoulLegacy");
      id = id.replace("ScatteredPieceOfDecarabiansDream", "ScatteredPieceOfDecarabianssDream");
      return [
        `https://genshin.honeyhunterworld.com/img/char/${snakeCase(id)}_face.png`,
      ];
    },
    [MaterialType.MATERIAL_FOOD]: (id: string) => {
      id = id.replace("Lily", "Lilly");
      id = id.replace("CrabHamVeggieBake", "Crab_ham_and_veggie");
      id = id.replace("QiankunMoraMeat", "Caelum_terra_mora_meat");
      id = id.replace("TripleLayeredConsomme", "Triple_layered_consome");
      id = id.replace("AdventurersBreakfastSandwich", "Adventurer_breakfast_sandwich");
      id = id.replace("InsulationPotion", "Insuliation_potion");
      id = id.replace("AlmondTofu", "Admond_tofu");
      id = id.replace("FishFlavoredToast", "Fishy_toast");
      id = id.replace("DefinitelyNotBarFood", "Definitely_not_drunk_food");
      id = id.replace("DerWeisheitLetzterSchlussLife", "Supreme_wisdom_life");
      id = id.replace("Filet", "Fillet");
      id = id.replace("SautedMatsutake", "Sauteed_matsutake");
      return [
        `https://genshin.honeyhunterworld.com/img/consumable/food/${snakeCase(id)}_70.png`,
        `https://genshin.honeyhunterworld.com/img/consumable/potion/${snakeCase(id)}_70.png`,
        `https://genshin.honeyhunterworld.com/img/consumable/food/${snakeCase(id.replace("Suspicious", ""))}_70.png`,
      ];
    },
    [MaterialType.MATERIAL_NOTICE_ADD_HP]: (id: string) => {
      id = id.replace("RadishVeggieSoup", "Raddish_veggie_soup");
      id = id.replace("MondstadtHashBrown", "Monstadt_hash_brown");
      id = id.replace("MatsutakeMeatRolls", "Matsutake_meat_roll");
      id = id.replace("AppleCider", "Apple_cider_vinegar");
      id = id.replace("AllDelicacyParcels", "Countryside_delicacy");
      return [
        `https://genshin.honeyhunterworld.com/img/consumable/food/${snakeCase(id)}_70.png`,
        `https://genshin.honeyhunterworld.com/img/consumable/potion/${snakeCase(id)}_70.png`,
        `https://genshin.honeyhunterworld.com/img/consumable/food/${snakeCase(id.replace("Suspicious", ""))}_70.png`,
      ];
    },
    [MaterialType.MATERIAL_EXCHANGE]: (id: string) => {
      id = id.replace("NoctilucousJade", "Noctilous_jade");
      id = id.replace("ShrimpMeat", "Shrimp");
      id = id.replace("VitalizedDragontooth", "Dragontooth_that_has_extracted_vitality");
      id = id.replace("Billet", "Prototype");
      return [
        `https://genshin.honeyhunterworld.com/img/ingredient/${snakeCase(id)}_70.png`,
        `https://genshin.honeyhunterworld.com/img/upgrade/gem/${snakeCase(id)}_70.png`,
      ];
    },
  };

  const items = data.filter(v => {
    if (v.Id === 110000) return false;
    if (v.MaterialType && MaterialType[v.MaterialType as any] in enabled) {
      const cnName = toText(v.NameTextMapHash, "zh-Hans");
      const cnType = toText(v.TypeDescTextMapHash, "zh-Hans");
      if (!cnType || cnName.includes("（废弃）") || cnName.includes("(test)") || cnName.includes("（test）")) return false;
      return true;
    }
    return false;
  });

  await fs.ensureDir("tmp/item");
  const TH = 4;
  for (let i = 0; i < items.length; i += TH) {
    const job = async (item: MaterialExcelConfigData) => {
      const id = toID(item.NameTextMapHash);
      const fn = `tmp/item/${id}.png`;
      // skip existed files
      if (await fs.pathExists(fn)) return;

      const urls = enabled[MaterialType[item.MaterialType as any]];
      let noitem = true;
      for (const url of urls(id)) {
        const isOK = await axios.head(url).catch(() => {});
        if (isOK) {
          const file = await axios.get(url, { responseType: "arraybuffer" });
          await fs.writeFile(fn, file.data);
          consola.success(`write ${id}.png`);
          noitem = false;
          break;
        }
      }
      if (noitem) {
        consola.error(`not found ${id}.png`);
      }
    };
    const jobfiles = items.slice(i, i + TH);
    await Promise.all(jobfiles.map(job));
  }

  return;
}

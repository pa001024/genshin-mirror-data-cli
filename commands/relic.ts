// artifact 圣遗物

import fs from "fs-extra";
import { uniqBy } from "lodash";
import { ArtifactType } from "../../genshin-mirror/modules/core/enum";
import { IArtifactType, IArtifactSet, IArtifactSetLevel } from "../../genshin-mirror/modules/core/interface";

// extra
import { DATA_DIR, saveTranslation, toDesc, toAttr, toID, affixMap, toNum, toText, relicSetMap } from "../util";

export async function run() {
  // await fs.emptyDir("dist/item");

  await parseArtifact();
  await parseArtifactSet();
}

async function parseArtifactSet() {
  interface ReliquarySetExcelConfigData {
    setId: number;
    setIcon: string;
    setNeedNum: number[];
    equipAffixId: number;
    containsList: number[];
    disableFilter?: number;
  }
  const data: ReliquarySetExcelConfigData[] = await fs.readJSON(DATA_DIR + "ExcelBinOutput/ReliquarySetExcelConfigData.json");

  const revMap: { [x: string]: number } = {
    /* EQUIP_BRACER */ 4: ArtifactType.FlowerOfLife,
    /* EQUIP_NECKLACE */ 2: ArtifactType.PlumeOfDeath,
    /* EQUIP_SHOES */ 5: ArtifactType.SandsOfEon,
    /* EQUIP_RING */ 1: ArtifactType.GobletOfEonothem,
    /* EQUIP_DRESS */ 3: ArtifactType.CircletOfLogos,
  };
  await saveTranslation("relicset", "relicset.json", t => {
    const rst = data
      .filter(v => v.equipAffixId)
      .map(v => {
        const needs = v.setNeedNum;
        const { name, localeName, levels } = toAffix(v.equipAffixId);
        const item: IArtifactSet = {
          id: v.setId,
          name: `${name}_${revMap[v.setIcon?.substr(-1)]}`,
          localeName,
          // maxLevel: v.MaxLevel || 1,
          levels,
        };
        return item;
        function toAffix(id: number) {
          const affixLevels = affixMap[id];
          const affix = affixLevels ? affixLevels[0] : undefined;
          return {
            name: (affix && toID(affix.nameTextMapHash)) || "???",
            localeName: (affix && t(affix.nameTextMapHash)) || "???",
            levels: affixLevels?.map((v, idx) => {
              return {
                need: needs[idx],
                desc: toDesc(t(v.descTextMapHash)),
                attrs: toAttr(v.addProps),
                params: v.paramList.filter(Boolean).map(toNum),
              };
            }),
          };
        }
      });
    return uniqBy(rst, "id");
  });
}
async function parseArtifact() {
  interface ReliquaryExcelConfigData {
    equipType: string;
    showPic: string;
    mainPropDepotId: number;
    appendPropDepotId: number;
    addPropLevels: number[];
    baseConvExp: number;
    maxLevel: number;
    destroyReturnMaterial: number[];
    destroyReturnMaterialCount: number[];
    id: number;
    nameTextMapHash: any;
    descTextMapHash: any;
    icon: string;
    itemType: string;
    weight: number;
    rank: number;
    gadgetId: number;
    rankLevel?: number;
    appendPropNum?: number;
    setId?: number;
    storyId?: number;
    destroyRule: string;
    initialLockState?: number;
    dropable?: boolean;
  }
  interface ReliquaryCodexExcelConfigData {
    id: number;
    suitId: number;
    level: number;
    cupId: number;
    leatherId: number;
    capId: number;
    flowerId: number;
    sandId: number;
    sortOrder: number;
  }
  const data: ReliquaryExcelConfigData[] = await fs.readJSON(DATA_DIR + "ExcelBinOutput/ReliquaryExcelConfigData.json");
  const codex: ReliquaryCodexExcelConfigData[] = await fs.readJSON(DATA_DIR + "ExcelBinOutput/ReliquaryCodexExcelConfigData.json");
  const enabledIds = new Set<number>([].concat(...codex.map(v => [v.cupId, v.leatherId, v.capId, v.flowerId, v.sandId] as any)));

  await saveTranslation("relic", "relic.json", t => {
    const rst = data
      .filter(v => v.rankLevel && v.setId && enabledIds.has(v.id))
      .map(v => {
        const setname = toID(affixMap[relicSetMap[v.setId!].equipAffixId][0].nameTextMapHash);
        const type = toArtifaceType(v.equipType);
        const item: IArtifactType = {
          id: v.id,
          name: `${setname}_${type}`,
          localeName: t(v.nameTextMapHash),
          desc: toDesc(t(v.descTextMapHash)),
          rarity: v.rankLevel!,
          setId: v.setId!,
          // maxLevel: v.MaxLevel || 1,
          type,
        };
        return item;
      });
    return uniqBy(rst, v => v.id);
  });
}

function toArtifaceType(str: string): ArtifactType {
  const mp: { [x: string]: ArtifactType } = {
    EQUIP_BRACER: ArtifactType.FlowerOfLife,
    EQUIP_NECKLACE: ArtifactType.PlumeOfDeath,
    EQUIP_SHOES: ArtifactType.SandsOfEon,
    EQUIP_RING: ArtifactType.GobletOfEonothem,
    EQUIP_DRESS: ArtifactType.CircletOfLogos,
  };
  return mp[str] || ArtifactType.FlowerOfLife;
}

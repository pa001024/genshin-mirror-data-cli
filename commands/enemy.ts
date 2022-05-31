import fs from "fs-extra";
import { uniqBy } from "lodash";
import { MonsterRarity } from "../../genshin-mirror/modules/core/enum";

// extra
import { DATA_DIR, saveTranslation, toDesc, toID, toNum, toText } from "../util";

export async function run() {
  // await fs.emptyDir("dist/enemy");

  await parseEnemy();
}

async function parseEnemy() {
  interface MonsterExcelConfigData {
    monsterName: string;
    type: string;
    // ScriptDataPathHashPre: number;
    // ScriptDataPathHashSuffix: number;
    serverScript: string;
    // CombatConfigHashPre: number;
    // CombatConfigHashSuffix: number;
    affix: any[];
    aI: string;
    isAIHashCheck: boolean;
    equips: number[];
    hpDrops: HpDrop[];
    killDropId: number;
    excludeWeathers: string;
    featureTagGroupId: number;
    mpPropId: number;
    skin: string;
    describeId: number;
    combatBGMLevel: number;
    hpBase: number;
    attackBase: number;
    defenseBase: number;
    fireSubHurt: number;
    grassSubHurt: number;
    waterSubHurt: number;
    elecSubHurt: number;
    windSubHurt: number;
    iceSubHurt: number;
    rockSubHurt: number;
    propGrowCurves: PropGrowCurve[];
    physicalSubHurt: number;
    // PrefabPathRagdollHashPre: number;
    // PrefabPathRagdollHashSuffix: number;
    id: number;
    nameTextMapHash: number;
    // PrefabPathHashPre: number;
    // PrefabPathHashSuffix: number;
    // PrefabPathRemoteHashPre: number;
    // PrefabPathRemoteHashSuffix: number;
    // ControllerPathHashPre: number;
    // ControllerPathHashSuffix: number;
    // ControllerPathRemoteHashPre: number;
    // ControllerPathRemoteHashSuffix: number;
    campId: number;
    lODPatternName: string;
  }
  interface PropGrowCurve {
    type: string;
    growCurve: string;
  }
  interface HpDrop {
    dropId?: number;
    hpPercent?: number;
  }
  interface MonsterDescribeExcelConfigData {
    id: number;
    nameTextMapHash: number;
    titleId: number;
    specialNameLabId: number;
    icon: string;
    descTextMapHash: number;
    lockDescTextMapHash: number;
  }
  interface MonsterRelationshipExcelConfigData {
    id: number;
    tagStr: string;
    monsterRarity: string;
  }
  const data: MonsterExcelConfigData[] = await fs.readJSON(DATA_DIR + "ExcelBinOutput/MonsterExcelConfigData.json");
  const relData: MonsterRelationshipExcelConfigData[] = await fs.readJSON(DATA_DIR + "ExcelBinOutput/MonsterRelationshipExcelConfigData.json");
  const relIndex = new Map(relData.map(v => [v.id, v]));
  const descData: MonsterDescribeExcelConfigData[] = await fs.readJSON(DATA_DIR + "ExcelBinOutput/MonsterDescribeExcelConfigData.json");
  const descIndex = new Map(descData.map(v => [v.id, v]));

  await saveTranslation("enemy", "enemy.json", t => {
    const rst = data
      .filter(v => descIndex.has(v.describeId))
      .map(v => {
        const desc = descIndex.get(v.describeId)!;
        const rel = relIndex.get(v.describeId);
        return {
          uid: v.id,
          id: toID(desc.nameTextMapHash),
          name: toText(desc.nameTextMapHash),
          localeName: t(desc.nameTextMapHash),
          desc: toDesc(t(desc.descTextMapHash)),
          baseHP: toNum(v.hpBase || 0),
          baseATK: toNum(v.attackBase || 0),
          baseDEF: toNum(v.defenseBase || 0), // 固定500
          type: MonsterRarity[rel?.monsterRarity as any],
          resist: [
            //
            toNum(v.fireSubHurt || 0),
            toNum(v.grassSubHurt || 0),
            toNum(v.waterSubHurt || 0),
            toNum(v.elecSubHurt || 0),
            toNum(v.windSubHurt || 0),
            toNum(v.iceSubHurt || 0),
            toNum(v.rockSubHurt || 0),
            toNum(v.physicalSubHurt || 0),
          ],
        };
      });

    return uniqBy(rst, "id"); // TODO: 简单去重可能丢信息 之后可能有不同变种
  });
}

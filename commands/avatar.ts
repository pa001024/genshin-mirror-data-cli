import fs from "fs-extra";
import { findLastIndex, uniqWith } from "lodash";
import * as xlsx from "xlsx";
import { BodyType, BuffType, Region, WeaponType } from "../../genshin-mirror/modules/core/enum";
import type { IAvatar, ISkill, IAscension, IConstellation, IAscensionPhase, ITalent, IItemStack, IItem } from "../../genshin-mirror/modules/core/interface";

// extra
import { DATA_DIR, Dict, saveTranslation, toNum, toText, toWeaponType, toTags, toElement, toItem, toID, toAttrType, toDesc, toAvatarID } from "../util";

export async function run() {
  // await fs.emptyDir("dist/char");

  await parseChar();
}

async function parseChar() {
  const data: AvatarExcelConfigData[] = await fs.readJSON(DATA_DIR + "ExcelBinOutput/AvatarExcelConfigData.json");
  const skillData: AvatarSkillExcelConfigData[] = await fs.readJSON(DATA_DIR + "ExcelBinOutput/AvatarSkillExcelConfigData.json");
  const skillIndex = new Map(skillData.map(v => [v.id, v]));
  const depotData: AvatarSkillDepotExcelConfigData[] = await fs.readJSON(DATA_DIR + "ExcelBinOutput/AvatarSkillDepotExcelConfigData.json");
  const depotIndex = new Map(depotData.map(v => [v.id, v]));
  const talentData: AvatarTalentExcelConfigData[] = await fs.readJSON(DATA_DIR + "ExcelBinOutput/AvatarTalentExcelConfigData.json");
  const talentIndex = new Map(talentData.map(v => [v.talentId, v]));
  const proudSkillData: ProudSkillExcelConfigData[] = await fs.readJSON(DATA_DIR + "ExcelBinOutput/ProudSkillExcelConfigData.json");
  const proudSkillIndex = proudSkillData.reduce<Dict<ProudSkillExcelConfigData[]>>((r, v) => {
    if (v.proudSkillGroupId in r) r[v.proudSkillGroupId].push(v);
    else r[v.proudSkillGroupId] = [v];
    return r;
  }, {});
  const promoteData: AvatarPromoteExcelConfigData[] = await fs.readJSON(DATA_DIR + "ExcelBinOutput/AvatarPromoteExcelConfigData.json");
  const promoteIndex = promoteData.reduce<Dict<AvatarPromoteExcelConfigData[]>>((r, v) => {
    if (v.avatarPromoteId in r) r[v.avatarPromoteId].push(v);
    else r[v.avatarPromoteId] = [v];
    return r;
  }, {});

  const normalAvatars = data.filter(v => v.useType === "AVATAR_FORMAL");

  const charList: IAvatar[] = [];

  for (const char of normalAvatars) {
    const tags = toTags(char.featureTagGroupID);
    const region = toRegion(char, tags);
    const id = toAvatarID(char.nameTextMapHash, region);

    if (id.includes("(Test)") || char.useType === "AVATAR_ABANDON" || char.useType === "AVATAR_SYNC_TEST") continue;
    await saveTranslation("char", id + ".json", (t, lang) => {
      const skills = toSkills(char.skillDepotId);
      const ascensions = toAscension(char.avatarPromoteId);
      const ascensionType = ascensions ? ascensions[0].attrs[3].type : 0;
      const avatar: IAvatar = {
        uid: char.id,
        id,
        name: toText(char.nameTextMapHash),
        localeName: t(char.nameTextMapHash),
        desc: toDesc(t(char.descTextMapHash)),
        baseHP: toNum(char.hpBase || 0),
        baseATK: toNum(char.attackBase || 0),
        baseDEF: toNum(char.defenseBase || 0),
        bodyType: toBodyType(char.bodyType),
        rarity: toRarity(char.qualityType),
        weapon: toWeaponType(char.weaponType),
        region,
        ascensions: ascensions.map(v => {
          const p: IAscensionPhase = {
            level: v.level,
            itemCost: v.itemCost,
            HP: v.attrs.find(v => v.type === BuffType.BaseHP)?.value || 0,
            ATK: v.attrs.find(v => v.type === BuffType.BaseATK)?.value || 0,
            DEF: v.attrs.find(v => v.type === BuffType.BaseDEF)?.value || 0,
            extra: v.attrs.find(v => v.type === ascensionType)?.value || 0,
          };
          return p;
        }),
        ascensionType,
        element: skills.element,
        elemSkill: skills.eSkill,
        elemBurst: skills.qSkill,
        attackSkill: skills.aSkill,
        talents: skills.talents,
        c13ns: skills.c13ns,
      };
      if (skills.items) {
        avatar.overviewItems = uniqWith(
          [
            ...avatar.ascensions[5].itemCost
              .map(v => toItem(v.id))
              .map(item => ({ id: toID(item.nameTextMapHash), localeName: t(item.nameTextMapHash), rarity: item.rankLevel })),
            ...skills.items,
          ],
          (a, b) => a.id === b.id
        );
      }
      // 全列表
      if (lang === "zh-Hans") charList.push(avatar);
      return avatar;

      function toAscension(aid: number) {
        const promote = promoteIndex[aid];
        return promote
          .filter(v => v.promoteLevel)
          .map(v => {
            const rst: IAscension = {
              level: v.promoteLevel || 0,
              itemCost: v.costItems.filter(v => v.id).map(it => {
                const item = toItem(it.id!);
                if (!item) {
                  // console.warn(`[item] ${id}:${it.Id} not found`);
                  return { id: "unknown", localeName: "???", count: it.count! };
                }
                return { id: toID(item.nameTextMapHash), localeName: t(item.nameTextMapHash), rarity: item.rankLevel, count: it.count! };
              }),
              attrs: v.addProps.filter(p => p.propType).map(p => {
                return { type: toAttrType(p.propType!), value: p.value ? toNum(p.value) : 0 };
              }),
            };
            return rst;
          });
      }

      function toSkills(depotId: number) {
        const depot = depotIndex.get(depotId)!;
        const [aSkill, eSkill] = depot.skills.filter(Boolean).map(toSkill);
        // const [aimPress,aim,weaponCD,teamCD]=depot.SubSkills.filter(Boolean).map(toSkill)
        // attackMode: depot.AttackModeSkill && toSkill(depot.AttackModeSkill),

        const elem = skillIndex.get(depot.energySkill)!;
        if (!elem) {
          // console.warn(`[skill] no elem of ${id}(${depotId}):${depot.EnergySkill}`);
        }
        return {
          aSkill, // 普攻
          eSkill, // E技能
          qSkill: depot.energySkill ? toSkill(depot.energySkill) : undefined,
          c13ns: depot.talents.filter(Boolean).map(toC13n),
          element: elem ? toElement(elem.costElemType!) : 0, // 元素
          talents: depot.inherentProudSkillOpens.filter(v => v.proudSkillGroupId).map(v => toTalent(v.proudSkillGroupId!, v.needAvatarPromoteLevel)),
          items: toSkillItems(depot.skills.filter(Boolean)[0]),
        };
      }

      function toC13n(talentId: number) {
        const talent = talentIndex.get(talentId)!;
        const values = talent.paramList.map(toNum).filter(Boolean);
        const rst: IConstellation = {
          name: toID(talent.nameTextMapHash),
          localeName: t(talent.nameTextMapHash),
          desc: toDesc(t(talent.descTextMapHash)),
          values: values.length ? values : undefined,
        };
        return rst;
      }
      function toSkill(skillId: number) {
        const skill = skillIndex.get(skillId)!;
        const proud = (skill.proudSkillGroupId && proudSkillIndex[skill.proudSkillGroupId]) || undefined;
        const rst: ISkill = {
          name: toID(skill.nameTextMapHash),
          localeName: t(skill.nameTextMapHash),
          desc: toDesc(t(skill.descTextMapHash)),
          cd: toNum(skill.cdTime || 0),
        };
        if (skill.costElemVal) rst.energyCost = skill.costElemVal;
        if (proud) {
          const tplLen = proud[0].paramDescList.map(v => toText(v)).findIndex(v => v === "");
          const valLen = findLastIndex(proud[0].paramList, v => v !== 0) + 1;
          if (tplLen) rst.paramTpls = proud[0].paramDescList.slice(0, tplLen).map(v => t(v));
          if (valLen) rst.paramVals = proud.map(lv => lv.paramList.slice(0, valLen).map(toNum));
          rst.costItems = proud.slice(1, 10).map(lv => lv.costItems.filter(v => v.id).map(toItemStack));
        }
        return rst;
      }
      function toSkillItems(skillId: number) {
        const skill = skillIndex.get(skillId)!;
        const proud = (skill.proudSkillGroupId && proudSkillIndex[skill.proudSkillGroupId]) || undefined;
        if (proud) {
          const costItems = proud[8].costItems.filter(v => v.id).map(toOverviewItem);
          return costItems;
        }
        return [];
      }
      function toOverviewItem(ci: CostItem) {
        const item = toItem(ci.id!);
        return { id: toID(item.nameTextMapHash), localeName: t(item.nameTextMapHash), rarity: item.rankLevel } as IItem;
      }
      function toItemStack(ci: CostItem) {
        const item = toItem(ci.id!);
        return { id: toID(item.nameTextMapHash), localeName: t(item.nameTextMapHash), rarity: item.rankLevel, count: ci.count } as IItemStack;
      }
      function toTalent(proudId: number, needLevel?: number) {
        const proud = proudSkillIndex[proudId][0];
        const rst: ITalent = {
          name: toID(proud.nameTextMapHash),
          localeName: t(proud.nameTextMapHash),
          desc: toDesc(t(proud.descTextMapHash)),
          unlock: needLevel,
          unlockDesc: toDesc(t(proud.unlockDescTextMapHash)) || undefined,
        };
        if (proud) {
          const tplLen = proud.paramDescList.map(v => toText(v)).findIndex(v => v === "");
          const valLen = proud.paramList.findIndex(v => v === 0);
          if (tplLen) rst.tpl = proud.paramDescList.slice(0, tplLen).map(v => t(v));
          if (valLen) rst.values = proud.paramList.slice(0, valLen).map(toNum);
        }
        return rst;
      }

      function toBodyType(raw: string) {
        return (BodyType[raw as any] as any) as BodyType;
      }

      function toRarity(raw: string) {
        const nm: Dict<number> = { QUALITY_BLUE: 3, QUALITY_PURPLE: 4, QUALITY_ORANGE: 5, QUALITY_ORANGE_SP: 5 };
        return nm[raw];
      }
    });
  }

  const charjson = charList.map(v => {
    const wtype: { [x: number]: string } = {
      [WeaponType.Sword]: "单手剑",
      [WeaponType.Polearm]: "长枪",
      [WeaponType.Catalyst]: "法器",
      [WeaponType.Bow]: "弓",
      [WeaponType.Claymore]: "双手剑",
    };
    const etype: { [x: number]: string } = {
      1: "风",
      2: "岩",
      3: "雷",
      4: "草",
      5: "水",
      6: "火",
      7: "冰",
    };
    return {
      角色: v.localeName,
      英文: v.id,
      生命: v.baseHP,
      防御: v.baseDEF,
      攻击: v.baseATK,
      武器: wtype[v.weapon],
      属性: etype[v.element],
    };
  });

  // 表格
  {
    const sheet = xlsx.utils.json_to_sheet(charjson);
    const book = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(book, sheet);
    await fs.ensureDir("dist/char");
    await xlsx.writeFile(book, "dist/char/char.xlsx");
  }

  function toRegion(char: AvatarExcelConfigData, tags: ReturnType<typeof toTags>) {
    try {
      const ids = new Set(tags.map(v => v.tagID));
      if (ids.has(1001)) return Region.Mondstadt;
      if (ids.has(1002)) return Region.Liyue;
      if (ids.has(1003)) return Region.Inazuma;
      if (ids.has(1004)) return Region.Sumeru;
      if (ids.has(1005)) return Region.Fontaine;
      if (ids.has(1006)) return Region.Natlan;
      if (ids.has(1007)) return Region.Snezhnaya;
    } catch {
      console.log(tags);
    }
    if (toID(char.nameTextMapHash) === "Traveler") return Region.Unknown;
    return Region.Snezhnaya;
  }
}

interface AvatarExcelConfigData {
  bodyType: string;
  scriptDataPathHashSuffix: number;
  scriptDataPathHashPre: number;
  iconName: string;
  sideIconName: string;
  qualityType: string;
  chargeEfficiency: number;
  combatConfigHashSuffix: number;
  combatConfigHashPre: number;
  initialWeapon: number;
  weaponType: string;
  manekinPathHashSuffix: number;
  manekinPathHashPre: number;
  imageName: string;
  gachaCardNameHashSuffix: number;
  gachaCardNameHashPre: number;
  gachaImageNameHashSuffix: number;
  gachaImageNameHashPre: number;
  cutsceneShow: string;
  skillDepotId: number;
  staminaRecoverSpeed: number;
  candSkillDepotIds: number[];
  manekinJsonConfigHashSuffix: number;
  manekinJsonConfigHashPre: number;
  manekinMotionConfig: number;
  descTextMapHash: number;
  avatarIdentityType: string;
  avatarPromoteId: number;
  avatarPromoteRewardLevelList: number[];
  avatarPromoteRewardIdList: number[];
  featureTagGroupID: number;
  infoDescTextMapHash: number;
  hpBase: number;
  attackBase: number;
  defenseBase: number;
  critical: number;
  criticalHurt: number;
  propGrowCurves: PropGrowCurve[];
  prefabPathRagdollHashSuffix: number;
  prefabPathRagdollHashPre: number;
  id: number;
  nameTextMapHash: number;
  prefabPathHashSuffix: number;
  prefabPathHashPre: number;
  prefabPathRemoteHashSuffix: number;
  prefabPathRemoteHashPre: number;
  controllerPathHashSuffix: number;
  controllerPathHashPre: number;
  controllerPathRemoteHashSuffix: number;
  controllerPathRemoteHashPre: number;
  LODPatternName: string;
  useType: string;
  isRangeAttack?: boolean;
}

interface PropGrowCurve {
  type: string;
  growCurve: string;
}

interface AvatarSkillExcelConfigData {
  id: number;
  nameTextMapHash: number;
  abilityName: string;
  descTextMapHash: number;
  skillIcon: string;
  costStamina: number;
  maxChargeNum: number;
  lockShape: string;
  lockWeightParams: number[];
  isAttackCameraLock: boolean;
  buffIcon: string;
  globalValueKey: string;
  cdTime?: number;
  triggerID?: number;
  dragType: string;
  showIconArrow?: boolean;
  proudSkillGroupId?: number;
  costElemType: string;
  costElemVal?: number;
  ignoreCDMinusRatio?: boolean;
  isRanged?: boolean;
  needMonitor: string;
  defaultLocked?: boolean;
  needStore?: boolean;
  cdSlot?: number;
  forceCanDoSkill?: boolean;
  energyMin?: number;
}

interface AvatarSkillDepotExcelConfigData {
  id: number;
  energySkill: number;
  skills: number[];
  subSkills: number[];
  extraAbilities: string[];
  talents: number[];
  talentStarName: string;
  inherentProudSkillOpens: InherentProudSkillOpen[];
  skillDepotAbilityGroup: string;
  leaderTalent?: number;
  attackModeSkill?: number;
}

interface InherentProudSkillOpen {
  proudSkillGroupId?: number;
  needAvatarPromoteLevel?: number;
}

interface InherentProudSkillOpen {
  proudSkillGroupId?: number;
  needAvatarPromoteLevel?: number;
}
interface AvatarPromoteExcelConfigData {
  avatarPromoteId: number;
  promoteAudio: string;
  costItems: CostItem[];
  unlockMaxLevel: number;
  addProps: AddProp[];
  promoteLevel?: number;
  scoinCost?: number;
  requiredPlayerLevel?: number;
}

interface CostItem {
  id?: number;
  count?: number;
}

interface AvatarTalentExcelConfigData {
  talentId: number;
  nameTextMapHash: number;
  descTextMapHash: number;
  icon: string;
  mainCostItemId: number;
  mainCostItemCount: number;
  openConfig: string;
  addProps: AddProp[];
  paramList: number[];
  prevTalent?: number;
}

interface AddProp {
  propType?: string;
  value?: number;
}

interface ProudSkillExcelConfigData {
  proudSkillId: number;
  proudSkillGroupId: number;
  level: number;
  proudSkillType: number;
  nameTextMapHash: number;
  descTextMapHash: number;
  unlockDescTextMapHash: number;
  icon: string;
  costItems: CostItem[];
  filterConds: string[];
  breakLevel: number;
  paramDescList: number[];
  lifeEffectParams: string[];
  openConfig: string;
  addProps: AddProp[];
  paramList: number[];
  lifeEffectType: string;
  coinCost?: number;
  effectiveForTeam?: number;
}

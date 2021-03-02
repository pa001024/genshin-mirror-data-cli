import fs from "fs-extra";
import { findLastIndex, uniqWith } from "lodash";
import { BodyType, BuffType, Region } from "../../genshin-mirror/modules/core/enum";
import type { IAvatar, ISkill, IAscension, IConstellation, IAscensionPhase, ITalent, IItemStack, IItem } from "../../genshin-mirror/modules/core/interface";

// extra
import { DATA_DIR, Dict, saveTranslation, toNum, toText, toWeaponType, toTags, toElement, toItem, toID, toAttrType, toDesc } from "../util";

export async function run() {
  // await fs.emptyDir("dist/char");

  await parseChar();
}

async function parseChar() {
  const data: AvatarExcelConfigData[] = await fs.readJSON(DATA_DIR + "Excel/AvatarExcelConfigData.json");
  const skillData: AvatarSkillExcelConfigData[] = await fs.readJSON(DATA_DIR + "Excel/AvatarSkillExcelConfigData.json");
  const skillIndex = new Map(skillData.map(v => [v.Id, v]));
  const depotData: AvatarSkillDepotExcelConfigData[] = await fs.readJSON(DATA_DIR + "Excel/AvatarSkillDepotExcelConfigData.json");
  const depotIndex = new Map(depotData.map(v => [v.Id, v]));
  const talentData: AvatarTalentExcelConfigData[] = await fs.readJSON(DATA_DIR + "Excel/AvatarTalentExcelConfigData.json");
  const talentIndex = new Map(talentData.map(v => [v.TalentId, v]));
  const proudSkillData: ProudSkillExcelConfigData[] = await fs.readJSON(DATA_DIR + "Excel/ProudSkillExcelConfigData.json");
  const proudSkillIndex = proudSkillData.reduce<Dict<ProudSkillExcelConfigData[]>>((r, v) => {
    if (v.ProudSkillGroupId in r) r[v.ProudSkillGroupId].push(v);
    else r[v.ProudSkillGroupId] = [v];
    return r;
  }, {});
  const promoteData: AvatarPromoteExcelConfigData[] = await fs.readJSON(DATA_DIR + "Excel/AvatarPromoteExcelConfigData.json");
  const promoteIndex = promoteData.reduce<Dict<AvatarPromoteExcelConfigData[]>>((r, v) => {
    if (v.AvatarPromoteId in r) r[v.AvatarPromoteId].push(v);
    else r[v.AvatarPromoteId] = [v];
    return r;
  }, {});

  const normalAvatars = data.filter(v => v.UseType === "AVATAR_FORMAL");

  for (const char of normalAvatars) {
    const id = toText(char.NameTextMapHash).replace(/ /g, "");
    if (id.includes("(Test)") || char.UseType === "AVATAR_ABANDON" || char.UseType === "AVATAR_SYNC_TEST") continue;
    await saveTranslation("char", id + ".json", t => {
      const tags = toTags(char.FeatureTagGroupID);
      const skills = toSkills(char.SkillDepotId);
      const ascensions = toAscension(char.AvatarPromoteId);
      const ascensionType = ascensions ? ascensions[0].attrs[3].type : 0;
      const avatar: IAvatar = {
        id: toID(char.NameTextMapHash),
        name: toText(char.NameTextMapHash),
        localeName: t(char.NameTextMapHash),
        desc: toDesc(t(char.DescTextMapHash)),
        baseHP: toNum(char.HpBase || 0),
        baseATK: toNum(char.AttackBase || 0),
        baseDEF: toNum(char.DefenseBase || 0),
        bodyType: toBodyType(char.BodyType),
        rarity: toRarity(char.QualityType),
        weapon: toWeaponType(char.WeaponType),
        region: toRegion(char, tags),
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
              .map(item => ({ id: toID(item.NameTextMapHash), localeName: t(item.NameTextMapHash), rarity: item.RankLevel })),
            ...skills.items,
          ],
          (a, b) => a.id === b.id
        );
      }
      return avatar;

      function toAscension(aid: number) {
        const promote = promoteIndex[aid];
        return promote
          .filter(v => v.PromoteLevel)
          .map(v => {
            const rst: IAscension = {
              level: v.PromoteLevel || 0,
              itemCost: v.CostItems.filter(v => v.Id).map(it => {
                const item = toItem(it.Id!);
                if (!item) {
                  // console.warn(`[item] ${id}:${it.Id} not found`);
                  return { id: "unknown", localeName: "???", count: it.Count! };
                }
                return { id: toID(item.NameTextMapHash), localeName: t(item.NameTextMapHash), rarity: item.RankLevel, count: it.Count! };
              }),
              attrs: v.AddProps.filter(p => p.PropType).map(p => {
                return { type: toAttrType(p.PropType!), value: p.Value ? toNum(p.Value) : 0 };
              }),
            };
            return rst;
          });
      }

      function toSkills(depotId: number) {
        const depot = depotIndex.get(depotId)!;
        const [aSkill, eSkill] = depot.Skills.filter(Boolean).map(toSkill);
        // const [aimPress,aim,weaponCD,teamCD]=depot.SubSkills.filter(Boolean).map(toSkill)
        // attackMode: depot.AttackModeSkill && toSkill(depot.AttackModeSkill),

        const elem = skillIndex.get(depot.EnergySkill)!;
        if (!elem) {
          // console.warn(`[skill] no elem of ${id}(${depotId}):${depot.EnergySkill}`);
        }
        return {
          aSkill, // 普攻
          eSkill, // E技能
          qSkill: depot.EnergySkill ? toSkill(depot.EnergySkill) : undefined,
          c13ns: depot.Talents.filter(Boolean).map(toC13n),
          element: elem ? toElement(elem.CostElemType!) : 0, // 元素
          talents: depot.InherentProudSkillOpens.filter(v => v.ProudSkillGroupId).map(v => toTalent(v.ProudSkillGroupId!, v.NeedAvatarPromoteLevel)),
          items: toSkillItems(depot.Skills.filter(Boolean)[0]),
        };
      }

      function toC13n(talentId: number) {
        const talent = talentIndex.get(talentId)!;
        const values = talent.ParamList.map(toNum).filter(Boolean);
        const rst: IConstellation = {
          name: toID(talent.NameTextMapHash),
          localeName: t(talent.NameTextMapHash),
          desc: toDesc(t(talent.DescTextMapHash)),
          values: values.length ? values : undefined,
        };
        return rst;
      }
      function toSkill(skillId: number) {
        const skill = skillIndex.get(skillId)!;
        const proud = (skill.ProudSkillGroupId && proudSkillIndex[skill.ProudSkillGroupId]) || undefined;
        const rst: ISkill = {
          name: toID(skill.NameTextMapHash),
          localeName: t(skill.NameTextMapHash),
          desc: toDesc(t(skill.DescTextMapHash)),
          cd: toNum(skill.CdTime || 0),
        };
        if (skill.CostElemVal) rst.energyCost = skill.CostElemVal;
        if (proud) {
          const tplLen = proud[0].ParamDescList.map(v => toText(v)).findIndex(v => v === "");
          const valLen = findLastIndex(proud[0].ParamList, v => v !== 0) + 1;
          if (tplLen) rst.paramTpls = proud[0].ParamDescList.slice(0, tplLen).map(v => t(v));
          if (valLen) rst.paramVals = proud.map(lv => lv.ParamList.slice(0, valLen).map(toNum));
          rst.costItems = proud.slice(1, 10).map(lv => lv.CostItems.filter(v => v.Id).map(toItemStack));
        }
        return rst;
      }
      function toSkillItems(skillId: number) {
        const skill = skillIndex.get(skillId)!;
        const proud = (skill.ProudSkillGroupId && proudSkillIndex[skill.ProudSkillGroupId]) || undefined;
        if (proud) {
          const costItems = proud[8].CostItems.filter(v => v.Id).map(toOverviewItem);
          return costItems;
        }
        return [];
      }
      function toOverviewItem(ci: CostItem) {
        const item = toItem(ci.Id!);
        return { id: toID(item.NameTextMapHash), localeName: t(item.NameTextMapHash), rarity: item.RankLevel } as IItem;
      }
      function toItemStack(ci: CostItem) {
        const item = toItem(ci.Id!);
        return { id: toID(item.NameTextMapHash), localeName: t(item.NameTextMapHash), rarity: item.RankLevel, count: ci.Count } as IItemStack;
      }
      function toTalent(proudId: number, needLevel?: number) {
        const proud = proudSkillIndex[proudId][0];
        const rst: ITalent = {
          name: toID(proud.NameTextMapHash),
          localeName: t(proud.NameTextMapHash),
          desc: toDesc(t(proud.DescTextMapHash)),
          unlock: needLevel,
          unlockDesc: toDesc(t(proud.UnlockDescTextMapHash)) || undefined,
        };
        if (proud) {
          const tplLen = proud.ParamDescList.map(v => toText(v)).findIndex(v => v === "");
          const valLen = proud.ParamList.findIndex(v => v === 0);
          if (tplLen) rst.tpl = proud.ParamDescList.slice(0, tplLen).map(v => t(v));
          if (valLen) rst.values = proud.ParamList.slice(0, valLen).map(toNum);
        }
        return rst;
      }

      function toRegion(char: AvatarExcelConfigData, tags: ReturnType<typeof toTags>) {
        const ids = new Set(tags.map(v => v.TagID));
        if (ids.has(1001)) return Region.Mondstadt;
        if (ids.has(1002)) return Region.Liyue;
        if (ids.has(1003)) return Region.Inazuma;
        if (ids.has(1004)) return Region.Sumeru;
        if (ids.has(1005)) return Region.Fontaine;
        if (ids.has(1006)) return Region.Natlan;
        if (ids.has(1007)) return Region.Snezhnaya;
        if (toID(char.NameTextMapHash) === "Traveler") return Region.Unknown;
        return Region.Snezhnaya;
      }

      function toBodyType(raw: string) {
        return (BodyType[raw as any] as any) as BodyType;
      }

      function toRarity(raw: string) {
        const nm: Dict<number> = { QUALITY_BLUE: 3, QUALITY_PURPLE: 4, QUALITY_ORANGE: 5 };
        return nm[raw];
      }
    });
  }
}

interface AvatarExcelConfigData {
  BodyType: string;
  ScriptDataPathHashSuffix: number;
  ScriptDataPathHashPre: number;
  IconName: string;
  SideIconName: string;
  QualityType: string;
  ChargeEfficiency: number;
  CombatConfigHashSuffix: number;
  CombatConfigHashPre: number;
  InitialWeapon: number;
  WeaponType: string;
  ManekinPathHashSuffix: number;
  ManekinPathHashPre: number;
  ImageName: string;
  GachaCardNameHashSuffix: number;
  GachaCardNameHashPre: number;
  GachaImageNameHashSuffix: number;
  GachaImageNameHashPre: number;
  CutsceneShow: string;
  SkillDepotId: number;
  StaminaRecoverSpeed: number;
  CandSkillDepotIds: number[];
  ManekinJsonConfigHashSuffix: number;
  ManekinJsonConfigHashPre: number;
  ManekinMotionConfig: number;
  DescTextMapHash: number;
  AvatarIdentityType: string;
  AvatarPromoteId: number;
  AvatarPromoteRewardLevelList: number[];
  AvatarPromoteRewardIdList: number[];
  FeatureTagGroupID: number;
  InfoDescTextMapHash: number;
  HpBase: number;
  AttackBase: number;
  DefenseBase: number;
  Critical: number;
  CriticalHurt: number;
  PropGrowCurves: PropGrowCurve[];
  PrefabPathRagdollHashSuffix: number;
  PrefabPathRagdollHashPre: number;
  Id: number;
  NameTextMapHash: number;
  PrefabPathHashSuffix: number;
  PrefabPathHashPre: number;
  PrefabPathRemoteHashSuffix: number;
  PrefabPathRemoteHashPre: number;
  ControllerPathHashSuffix: number;
  ControllerPathHashPre: number;
  ControllerPathRemoteHashSuffix: number;
  ControllerPathRemoteHashPre: number;
  LODPatternName: string;
  UseType: string;
  IsRangeAttack?: boolean;
}

interface PropGrowCurve {
  Type: string;
  GrowCurve: string;
}

interface AvatarSkillExcelConfigData {
  Id: number;
  NameTextMapHash: number;
  AbilityName: string;
  DescTextMapHash: number;
  SkillIcon: string;
  CostStamina: number;
  MaxChargeNum: number;
  LockShape: string;
  LockWeightParams: number[];
  IsAttackCameraLock: boolean;
  BuffIcon: string;
  GlobalValueKey: string;
  CdTime?: number;
  TriggerID?: number;
  DragType: string;
  ShowIconArrow?: boolean;
  ProudSkillGroupId?: number;
  CostElemType: string;
  CostElemVal?: number;
  IgnoreCDMinusRatio?: boolean;
  IsRanged?: boolean;
  NeedMonitor: string;
  DefaultLocked?: boolean;
  NeedStore?: boolean;
  CdSlot?: number;
  ForceCanDoSkill?: boolean;
  EnergyMin?: number;
}

interface AvatarSkillDepotExcelConfigData {
  Id: number;
  EnergySkill: number;
  Skills: number[];
  SubSkills: number[];
  ExtraAbilities: string[];
  Talents: number[];
  TalentStarName: string;
  InherentProudSkillOpens: InherentProudSkillOpen[];
  SkillDepotAbilityGroup: string;
  LeaderTalent?: number;
  AttackModeSkill?: number;
}

interface InherentProudSkillOpen {
  ProudSkillGroupId?: number;
  NeedAvatarPromoteLevel?: number;
}

interface InherentProudSkillOpen {
  ProudSkillGroupId?: number;
  NeedAvatarPromoteLevel?: number;
}
interface AvatarPromoteExcelConfigData {
  AvatarPromoteId: number;
  PromoteAudio: string;
  CostItems: CostItem[];
  UnlockMaxLevel: number;
  AddProps: AddProp[];
  PromoteLevel?: number;
  ScoinCost?: number;
  RequiredPlayerLevel?: number;
}

interface CostItem {
  Id?: number;
  Count?: number;
}

interface AvatarTalentExcelConfigData {
  TalentId: number;
  NameTextMapHash: number;
  DescTextMapHash: number;
  Icon: string;
  MainCostItemId: number;
  MainCostItemCount: number;
  OpenConfig: string;
  AddProps: AddProp[];
  ParamList: number[];
  PrevTalent?: number;
}

interface AddProp {
  PropType?: string;
  Value?: number;
}

interface ProudSkillExcelConfigData {
  ProudSkillId: number;
  ProudSkillGroupId: number;
  Level: number;
  ProudSkillType: number;
  NameTextMapHash: number;
  DescTextMapHash: number;
  UnlockDescTextMapHash: number;
  Icon: string;
  CostItems: CostItem[];
  FilterConds: string[];
  BreakLevel: number;
  ParamDescList: number[];
  LifeEffectParams: string[];
  OpenConfig: string;
  AddProps: AddProp[];
  ParamList: number[];
  LifeEffectType: string;
  CoinCost?: number;
  EffectiveForTeam?: number;
}

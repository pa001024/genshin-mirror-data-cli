import fs from "fs-extra";
// extra
import type { IWeaponAscension, IWeaponAffix, IWeapon, IItem } from "../../genshin-mirror/modules/core/interface";
import { DATA_DIR, toAttrType, toCurve, toNum, toWeaponType, toText, toID, saveTranslation, toDesc, toAttr, affixMap, toItem } from "../util";
import { uniqBy } from "lodash";

export async function run() {
  const data: WeaponData[] = await fs.readJSON(DATA_DIR + "ExcelBinOutput/WeaponExcelConfigData.json");
  // 突破数据
  const promoteMap = ((await fs.readJSON(DATA_DIR + "ExcelBinOutput/WeaponPromoteExcelConfigData.json")) as WeaponPromoteData[]).reduce<{
    [x: number]: WeaponPromoteData[];
  }>((r, v) => {
    if (!r[v.weaponPromoteId]) {
      r[v.weaponPromoteId] = [v];
    } else {
      r[v.weaponPromoteId].push(v);
    }
    return r;
  }, {});

  await saveTranslation("weapon", "weapon.json", t => {
    const rst = data
      .filter(weapon => {
        return toID(weapon.nameTextMapHash);
      })
      .map(v => {
        const promote = promoteMap[v.weaponPromoteId];
        const rst: IWeapon = {
          uid: v.id,
          id: toID(v.nameTextMapHash),
          name: toText(v.nameTextMapHash),
          localeName: t(v.nameTextMapHash),
          desc: toDesc(t(v.descTextMapHash)),
          rarity: v.rankLevel,
          type: toWeaponType(v.weaponType),
          ascensions: toPromoteStage(promote),
          baseATK: toNum(v.weaponProp[0].initValue!),
          baseATKCurve: toCurve(v.weaponProp[0].type),
        };
        if (rst.ascensions.length > 5) {
          rst.overviewItems = rst.ascensions[5].cost.map(toOverviewItem);
        }
        if (v.weaponProp[1].propType && v.weaponProp[1].initValue)
          rst.subAttr = {
            type: toAttrType(v.weaponProp[1].propType),
            value: toNum(v.weaponProp[1].initValue),
            curve: toCurve(v.weaponProp[1].type),
          };

        // 特效
        if (v.skillAffix[0]) rst.affix = toAffix(v.skillAffix[0]);
        return rst;
      });
    return uniqBy(rst, "id");
    function toPromoteStage(data: WeaponPromoteData[]): IWeaponAscension[] {
      return data
        .filter(v => v.promoteLevel)
        .map(lv => {
          return {
            level: lv.promoteLevel!,
            baseATK: toNum(lv.addProps[0].value!),
            cost: lv.costItems.filter(v => v.id).map(v => {
              const item = toItem(v.id!);
              if (!item) {
                // console.warn(`[item] ${id}:${it.Id} not found`);
                return { id: "unknown", localeName: "???", count: v.count! };
              }
              return { id: toID(item.nameTextMapHash), localeName: t(item.nameTextMapHash), count: v.count! };
            }),
          };
        });
    }
    function toAffix(id: number): IWeaponAffix {
      const affixLevels = affixMap[id];
      const affix = affixLevels[0];
      return {
        name: t(affix.nameTextMapHash) || "???",
        levels: affixLevels.map(v => {
          const attrs = toAttr(v.addProps);
          return {
            desc: toDesc(t(v.descTextMapHash)),
            attrs: attrs.length ? attrs : undefined,
            params: v.paramList.filter(Boolean).map(toNum),
          };
        }),
      };
    }
    function toOverviewItem(ci: { id: string }) {
      const item = toItem(ci.id!);
      return { id: toID(item.nameTextMapHash), name: t(item.nameTextMapHash), rarity: item.rankLevel } as IItem;
    }
  });
}

interface WeaponData {
  id: number;
  weaponType: string;
  rankLevel: number;
  weaponBaseExp: number;
  skillAffix: number[];
  weaponProp: WeaponProp[];
  awakenTexture: string;
  awakenIcon: string;
  weaponPromoteId: number;
  storyId: number;
  awakenCosts: number[];
  gachaCardNameHashPre: number;
  gachaCardNameHashSuffix: number;
  destroyRule?: string;
  destroyReturnMaterial: number[];
  destroyReturnMaterialCount: number[];
  nameTextMapHash: number;
  descTextMapHash: number;
  icon: string;
  itemType: string;
  weight: number;
  rank: number;
  gadgetId: number;
  initialLockState?: number;
  awakenMaterial?: number;
  enhanceRule?: number;
  unrotate?: boolean;
}

interface WeaponProp {
  propType?: string;
  initValue?: number;
  type: string;
}

interface WeaponPromoteData {
  weaponPromoteId: number;
  costItems: CostItem[];
  addProps: WeaponPromoteAddProp[];
  unlockMaxLevel: number;
  promoteLevel?: number;
  requiredPlayerLevel?: number;
  coinCost?: number;
}

interface WeaponPromoteAddProp {
  propType: string;
  value?: number;
}

interface CostItem {
  id?: number;
  count?: number;
}

import fs from "fs-extra";
import { groupBy, keyBy, map, values } from "lodash";
import { BuffType } from "../../genshin-mirror/modules/core/enum";

// extra
import { DATA_DIR, Dict, saveObject, toAttrType, toNum, toText } from "../util";

export async function run() {
  await fs.emptyDir("dist/curve");
  await parseWeapon();
  await parseFetter();
  await parseChar();
  await parseCoeff();
  await parseMainattr();
  await parseSubAttr();
  await parsePlayerLevel();
  await parseMonsterLevel();
}

async function parseMonsterLevel() {
  const data: MonsterCurveExcelConfigData[] = await fs.readJSON(DATA_DIR + "ExcelBinOutput/MonsterCurveExcelConfigData.json");

  const cols = data[0].CurveInfos.map(v => v.Type);

  await saveObject(
    "curve",
    "enemy.json",
    cols.reduce<Dict<number[]>>((r, v, i) => {
      r[v] = data.map(v => toNum(v.CurveInfos[i].Value! || 0));
      return r;
    }, {})
  );
}
async function parsePlayerLevel() {
  const data: PlayerLevelExcelConfigData[] = await fs.readJSON(DATA_DIR + "ExcelBinOutput/PlayerLevelExcelConfigData.json");

  await saveObject(
    "curve",
    "playerLevel.json",
    data.map(v => {
      const rst: any = { lv: v.Level, exp: v.Exp };
      const unlock = toText(v.UnlockDescTextMapHash);
      if (unlock) rst.unlock = unlock;
      return rst;
    })
  );
}

async function parseWeapon() {
  const data: WeaponCurveExcelConfigData[] = await fs.readJSON(DATA_DIR + "ExcelBinOutput/WeaponCurveExcelConfigData.json");

  const rst: WeaponCurveResultData = {};

  for (const level of data) {
    level.CurveInfos.map(v => {
      if (!rst[v.Type]) {
        rst[v.Type] = [toNum(v.Value)];
      } else {
        rst[v.Type].push(toNum(v.Value));
      }
    });
  }

  await saveObject("curve", "weapon.json", rst);
}

async function parseChar() {
  interface AvatarCurveExcelConfigData {
    Level: number;
    CurveInfos: CurveInfo[];
  }

  interface CurveInfo {
    Type: string;
    Arith: string;
    Value: number;
  }
  const data: AvatarCurveExcelConfigData[] = await fs.readJSON(DATA_DIR + "ExcelBinOutput/AvatarCurveExcelConfigData.json");

  const rst: WeaponCurveResultData = {};

  for (const level of data) {
    level.CurveInfos.map(v => {
      if (!rst[v.Type]) {
        rst[v.Type] = [toNum(v.Value)];
      } else {
        rst[v.Type].push(toNum(v.Value));
      }
    });
  }

  await saveObject("curve", "avatar.json", rst);
}
async function parseFetter() {
  interface AvatarFettersLevelExcelConfigData {
    FetterLevel: number;
    NeedExp: number;
  }
  const data: AvatarFettersLevelExcelConfigData[] = await fs.readJSON(DATA_DIR + "ExcelBinOutput/AvatarFettersLevelExcelConfigData.json");

  await saveObject("curve", "fetters.json", {
    exp: data.map(v => v.NeedExp),
  });
}

async function parseCoeff() {
  const data: ElementCoeffExcelConfigData[] = await fs.readJSON(DATA_DIR + "ExcelBinOutput/ElementCoeffExcelConfigData.json");

  const rst = {
    crash: data.filter(v => v.Level).map(v => toNum(v.CrashCo)),
    element: data.filter(v => v.Level).map(v => toNum(v.ElementLevelCo)),
    shield: data.filter(v => v.Level).map(v => toNum(v.PlayerShieldLevelCo)),
  };

  await saveObject("curve", "coeff.json", rst);
}

async function parseMainattr() {
  const data: ReliquaryLevelExcelConfigData[] = await fs.readJSON(DATA_DIR + "ExcelBinOutput/ReliquaryLevelExcelConfigData.json");
  const dropData: ReliquaryMainPropExcelConfigData[] = await fs.readJSON(DATA_DIR + "ExcelBinOutput/ReliquaryMainPropExcelConfigData.json");

  const normalData = data.filter(v => v.Rank);

  const groups = groupBy(normalData, v => v.Rank);
  const typenames = groups[5][0].AddProps.map(v => BuffType[toAttrType(v.PropType)]);

  const rst = map(groups, (group, rank) => {
    const maxLevel = toMaxLevel(~~rank);
    const normalGroup = group
      .filter(v => v.Level <= maxLevel)
      .map(v => {
        return v.AddProps.map(v => toNum(v.Value));
      });

    return normalGroup;
  });
  const weights = [
    // 花
    toWeight(4000),
    // 毛
    toWeight(2000),
    // 沙
    toWeight(1000),
    // 时
    toWeight(5000),
    // 头
    toWeight(3000),
  ];
  await saveObject("curve", "mainattr.json", {
    data: rst,
    typenames,
    weights,
  });

  function toWeight(depotId: number) {
    const weightMap = keyBy(
      dropData.filter(v => v.PropDepotId === depotId),
      v => BuffType[toAttrType(v.PropType)]
    );
    const rst = typenames.reduce<Dict<number>>((r, v) => {
      if (!weightMap[v]?.Weight) return r;
      r[v] = weightMap[v].Weight;
      return r;
    }, {});
    return rst;
  }
}


 async function parseSubAttr() {
  interface ReliquaryAffixData {
    Id: number;
    DepotId: number;
    GroupId: number;
    PropType: string;
    PropValue: number;
    Weight: number;
    UpgradeWeight: number;
  }

  const data: ReliquaryAffixData[] = await fs.readJSON(DATA_DIR + "ExcelBinOutput/ReliquaryAffixExcelConfigData.json");

  const normalDepotId = new Set([101, 201, 301, 401, 501]);
  const normalAffix = data.filter(v => normalDepotId.has(v.DepotId));

  const groups = values(groupBy(normalAffix, v => v.DepotId));
  const rst = groups.map(group => {
    const typeMap = groupBy(group, v => v.PropType);
    return map(typeMap, (val, prop) => {
      const type = toAttrType(prop);
      return { type: BuffType[type], values: val.map(v => toNum(v.PropValue)), weight: val[0].Weight };
    });
  });
  await saveObject("curve", "subattr.json", rst);
}


function toMaxLevel(rank: number) {
  return [0, 5, 9, 13, 17, 21][rank];
}

interface ReliquaryLevelExcelConfigData {
  Level: number;
  AddProps: AddProp[];
  Rank?: number;
  Exp?: number;
}

interface AddProp {
  PropType: string;
  Value: number;
}

interface ReliquaryMainPropExcelConfigData {
  Id: number;
  PropDepotId: number;
  PropType: string;
  AffixName: string;
  Weight: number;
}

interface ElementCoeffExcelConfigData {
  Level: number;
  CrashCo: number;
  ElementLevelCo: number;
  PlayerElementLevelCo: number;
  PlayerShieldLevelCo: number;
}

interface WeaponCurveResultData {
  [x: string]: number[];
}

interface WeaponCurveExcelConfigData {
  Level: number;
  CurveInfos: WeaponCurveInfo[];
}

interface WeaponCurveInfo {
  Type: string;
  Arith: string;
  Value: number;
}

interface PlayerLevelExcelConfigData {
  Level: number;
  Exp: number;
  UnlockDescTextMapHash: number;
}

interface MonsterCurveExcelConfigData {
  Level: number;
  CurveInfos: CurveInfo[];
}

interface CurveInfo {
  Type: string;
  Arith: string;
  Value?: number;
}

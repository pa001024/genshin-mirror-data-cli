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

  const cols = data[0].curveInfos.map(v => v.type);

  await saveObject(
    "curve",
    "enemy.json",
    cols.reduce<Dict<number[]>>((r, v, i) => {
      r[v] = data.map(v => toNum(v.curveInfos[i].value! || 0));
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
      const rst: any = { lv: v.level, exp: v.exp };
      const unlock = toText(v.unlockDescTextMapHash);
      if (unlock) rst.unlock = unlock;
      return rst;
    })
  );
}

async function parseWeapon() {
  const data: WeaponCurveExcelConfigData[] = await fs.readJSON(DATA_DIR + "ExcelBinOutput/WeaponCurveExcelConfigData.json");

  const rst: WeaponCurveResultData = {};

  for (const level of data) {
    level.curveInfos.map(v => {
      if (!rst[v.type]) {
        rst[v.type] = [toNum(v.value)];
      } else {
        rst[v.type].push(toNum(v.value));
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
    crash: data.filter(v => v.level).map(v => toNum(v.crashCo)),
    element: data.filter(v => v.level).map(v => toNum(v.elementLevelCo)),
    shield: data.filter(v => v.level).map(v => toNum(v.playerShieldLevelCo)),
  };

  await saveObject("curve", "coeff.json", rst);
}

async function parseMainattr() {
  const data: ReliquaryLevelExcelConfigData[] = await fs.readJSON(DATA_DIR + "ExcelBinOutput/ReliquaryLevelExcelConfigData.json");
  const dropData: ReliquaryMainPropExcelConfigData[] = await fs.readJSON(DATA_DIR + "ExcelBinOutput/ReliquaryMainPropExcelConfigData.json");

  const normalData = data.filter(v => v.rank);

  const groups = groupBy(normalData, v => v.rank);
  const typenames = groups[5][0].addProps.map(v => BuffType[toAttrType(v.propType)]);

  const rst = map(groups, (group, rank) => {
    const maxLevel = toMaxLevel(~~rank);
    const normalGroup = group
      .filter(v => v.level <= maxLevel)
      .map(v => {
        return v.addProps.map(v => toNum(v.value));
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
      dropData.filter(v => v.propDepotId === depotId),
      v => BuffType[toAttrType(v.propType)]
    );
    const rst = typenames.reduce<Dict<number>>((r, v) => {
      if (!weightMap[v]?.weight) return r;
      r[v] = weightMap[v].weight;
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
  level: number;
  addProps: AddProp[];
  rank?: number;
  exp?: number;
}

interface AddProp {
  propType: string;
  value: number;
}

interface ReliquaryMainPropExcelConfigData {
  id: number;
  propDepotId: number;
  propType: string;
  affixName: string;
  weight: number;
}

interface ElementCoeffExcelConfigData {
  level: number;
  crashCo: number;
  elementLevelCo: number;
  playerElementLevelCo: number;
  playerShieldLevelCo: number;
}

interface WeaponCurveResultData {
  [x: string]: number[];
}

interface WeaponCurveExcelConfigData {
  level: number;
  curveInfos: WeaponCurveInfo[];
}

interface WeaponCurveInfo {
  type: string;
  arith: string;
  value: number;
}

interface PlayerLevelExcelConfigData {
  level: number;
  exp: number;
  unlockDescTextMapHash: number;
}

interface MonsterCurveExcelConfigData {
  level: number;
  curveInfos: CurveInfo[];
}

interface CurveInfo {
  type: string;
  arith: string;
  value?: number;
}

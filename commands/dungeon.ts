import fs from "fs-extra";
import { uniqBy } from "lodash";
import { DungeonType } from "../../genshin-mirror/modules/core/enum";

// extra
import { DATA_DIR, saveTranslation, toDesc, toElement, toText } from "../util";

export async function run() {
  // await fs.emptyDir("dist/dungeon");

  await parseDungeon();
}

async function parseDungeon() {
  interface LevelConfigMap {
    [key: number]: number;
  }
  interface EnterCostItem {
    id: number;
  }
  interface DungeonExcelConfigData {
    id: number;
    nameTextMapHash: any;
    displayNameTextMapHash: any;
    descTextMapHash: any;
    type: string;
    sceneId: number;
    involveType: string;
    showLevel: number;
    limitLevel: number;
    levelRevise: number;
    passCond: number;
    reviveMaxCount: number;
    dayEnterCount: number;
    enterCostItems: EnterCostItem[];
    passRewardPreviewID: number;
    settleCountdownTime: number;
    settleShows: string[];
    settleUIType: string;
    recommendElementTypes: string[];
    levelConfigMap: LevelConfigMap;
    cityID: number;
    entryPicPath: string;
    stateType: "DUNGEON_STATE_RELEASE" | "DUNGEON_STATE_TEST";
    avatarLimitType?: number;
    isDynamicLevel?: boolean;
    forbiddenRestart?: boolean;
    serialId?: number;
    passJumpDungeon?: number;
    dontShowPushTips?: boolean;
    playType: string;
    eventInterval?: number;
    firstPassRewardPreviewID?: number;
    statueCostID?: number;
    statueCostCount?: number;
    statueDrop?: number;
    reviveIntervalTime?: number;
  }
  interface SatisfiedCond {
    type: string;
    param1: number;
  }

  interface DungeonEntryExcelConfigData {
    id: number;
    dungeonEntryId: number;
    type: string;
    descTextMapHash: any;
    cooldownTipsDungeonId: number[];
    condComb: string;
    satisfiedCond: SatisfiedCond[];
    picPath: string;
    systemOpenUiId: number;
    rewardDataId: number;
    descriptionCycleRewardList: number[][];
    isDailyRefresh?: boolean;
    isDefaultOpen?: boolean;
  }

  const data: DungeonExcelConfigData[] = await fs.readJSON(DATA_DIR + "ExcelBinOutput/DungeonExcelConfigData.json");
  const entryData: DungeonEntryExcelConfigData[] = await fs.readJSON(DATA_DIR + "ExcelBinOutput/DungeonEntryExcelConfigData.json");
  const entryIndex = new Map(entryData.map(v => [v.id, v]));

  await saveTranslation("dungeon", "dungeon.json", t => {
    const rst = data
      .filter(v => {
        const cnName = toText(v.nameTextMapHash, "zh-Hans");
        return !cnName.includes("(test)");
      })
      .map(v => {
        return {
          id: v.id,
          name: toText(v.nameTextMapHash),
          localeName: t(v.nameTextMapHash),
          desc: toDesc(t(v.descTextMapHash)),
          elements: v.recommendElementTypes.map(toElement).filter(Boolean),
          type: DungeonType[v.type as any],
        };
      });

    return uniqBy(rst, "id"); // TODO: 简单去重可能丢信息 之后可能有不同变种
  });
}

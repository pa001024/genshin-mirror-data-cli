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
    Id: number;
  }
  interface DungeonExcelConfigData {
    Id: number;
    NameTextMapHash: any;
    DisplayNameTextMapHash: any;
    DescTextMapHash: any;
    Type: string;
    SceneId: number;
    InvolveType: string;
    ShowLevel: number;
    LimitLevel: number;
    LevelRevise: number;
    PassCond: number;
    ReviveMaxCount: number;
    DayEnterCount: number;
    EnterCostItems: EnterCostItem[];
    PassRewardPreviewID: number;
    SettleCountdownTime: number;
    SettleShows: string[];
    SettleUIType: string;
    RecommendElementTypes: string[];
    LevelConfigMap: LevelConfigMap;
    CityID: number;
    EntryPicPath: string;
    StateType: "DUNGEON_STATE_RELEASE" | "DUNGEON_STATE_TEST";
    AvatarLimitType?: number;
    IsDynamicLevel?: boolean;
    ForbiddenRestart?: boolean;
    SerialId?: number;
    PassJumpDungeon?: number;
    DontShowPushTips?: boolean;
    PlayType: string;
    EventInterval?: number;
    FirstPassRewardPreviewID?: number;
    StatueCostID?: number;
    StatueCostCount?: number;
    StatueDrop?: number;
    ReviveIntervalTime?: number;
  }
  interface SatisfiedCond {
    Type: string;
    Param1: number;
  }

  interface DungeonEntryExcelConfigData {
    Id: number;
    DungeonEntryId: number;
    Type: string;
    DescTextMapHash: any;
    CooldownTipsDungeonId: number[];
    CondComb: string;
    SatisfiedCond: SatisfiedCond[];
    PicPath: string;
    SystemOpenUiId: number;
    RewardDataId: number;
    DescriptionCycleRewardList: number[][];
    IsDailyRefresh?: boolean;
    IsDefaultOpen?: boolean;
  }

  const data: DungeonExcelConfigData[] = await fs.readJSON(DATA_DIR + "ExcelBinOutput/DungeonExcelConfigData.json");
  const entryData: DungeonEntryExcelConfigData[] = await fs.readJSON(DATA_DIR + "ExcelBinOutput/DungeonEntryExcelConfigData.json");
  const entryIndex = new Map(entryData.map(v => [v.Id, v]));

  await saveTranslation("dungeon", "dungeon.json", t => {
    const rst = data
      .filter(v => {
        const cnName = toText(v.NameTextMapHash, "zh-Hans");
        return !cnName.includes("(test)");
      })
      .map(v => {
        return {
          id: v.Id,
          name: toText(v.NameTextMapHash),
          localeName: t(v.NameTextMapHash),
          desc: toDesc(t(v.DescTextMapHash)),
          elements: v.RecommendElementTypes.map(toElement).filter(Boolean),
          type: DungeonType[v.Type as any],
        };
      });

    return uniqBy(rst, "id"); // TODO: 简单去重可能丢信息 之后可能有不同变种
  });
}

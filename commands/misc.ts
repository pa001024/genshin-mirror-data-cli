import fs from "fs-extra";
import { uniqBy } from "lodash";

// extra
import { DATA_DIR, saveTranslation, toDesc, toID, toNum, toText } from "../util";

export async function run() {
  // await fs.emptyDir("dist/item");

  await parseTeamResonance();
}

async function parseTeamResonance() {
  interface TeamResonanceExcelConfigData {
    teamResonanceId: number;
    teamResonanceGroupId: number;
    level: number;
    fireAvatarCount?: number;
    nameTextMapHash: number;
    descTextMapHash: number;
    openConfig: string;
    addProps: any[];
    paramList: number[];
    waterAvatarCount?: number;
    windAvatarCount?: number;
    electricAvatarCount?: number;
    iceAvatarCount?: number;
    rockAvatarCount?: number;
    cond?: string;
  }

  interface ItemUse {
    UseParam: string[];
  }
  const data: TeamResonanceExcelConfigData[] = await fs.readJSON(DATA_DIR + "ExcelBinOutput/TeamResonanceExcelConfigData.json");

  await saveTranslation("misc", "resonance.json", t => {
    const rst = data.map(v => {
      const item = {
        id: toID(v.nameTextMapHash),
        name: toText(v.nameTextMapHash),
        localeName: t(v.nameTextMapHash),
        desc: toDesc(t(v.descTextMapHash)),
        param: v.paramList?.map(toNum),
      };
      return item;
    });
    return uniqBy(rst, "id");
  });
}

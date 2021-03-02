import axios from "axios";
import consola from "consola";
import fs from "fs-extra";
import { snakeCase, startCase } from "lodash";
import { ArtifactType } from "../../genshin-mirror/modules/core/enum";
import { IAvatar } from "../../genshin-mirror/modules/core/interface";

// extra
import { affixMap, DATA_DIR, toID, toText } from "../util";

export async function run() {
  // await fs.emptyDir("dist/item");

  await parseRelicImg();
}

async function parseRelicImg() {
  const fl = await fs.readdir("dist/en/char/");

  const data: IAvatar[] = fl.map(v => fs.readJSONSync(`dist/en/char/${v}`));

  const items: { name: string; type: string; char: string }[] = [].concat(
    ...(data.map(a => {
      return [
        // -
        { name: a.attackSkill?.name, type: "skill", char: a.name },
        { name: a.elemSkill?.name, type: "skill", char: a.name },
        { name: a.elemBurst?.name, type: "skill", char: a.name },
        ...(a.talents?.map(v => ({ name: v.name, type: "talent", char: a.name })) || []),
        ...(a.c13ns?.map(v => ({ name: v.name, type: "talent", char: a.name })) || []),
      ].filter(v => v && v.name && v.char !== "Kamisato Ayaka");
    }) as any)
  );
  await fs.ensureDir("tmp/skill");
  const TH = 4;
  for (let i = 0; i < items.length; i += TH) {
    const job = async (item: typeof items[number]) => {
      const id = item.name
        .split(/\s+/g)
        .map(v => startCase(v))
        .join("")
        .replace(/\W+/g, "");
      const fn = `tmp/skill/${id}.png`;
      // skip existed files
      if (await fs.pathExists(fn)) return;

      const urlmaps: { [x: string]: string } = {
        AbiogenesisSolarIsotoma: "abiogenesis_solar_radiance",
        NormalAttackFavoniusBladeworkWeiss: "favonius_bladework_white",
        CalciteMight: "calcite_suppression",
        HomuncularNature: "albedo_p4_talent",
        DustOfPurification: "domain_of_purification",
        ItsNotJustAnyDoll: "not_just_any_doll",
        UponTheTurbulentSeaTheThunderArises: "upon_the_turbulent_sea",
        TrueExplorer: "the_explorer",
        SpiritBladeChonghuasLayeredFrost: "spirit_blade_chonghuas",
        AtmosphericRevolution: "atmo_revolution",
        FlamingSwordNemesisOfTheDark: "flaming_sword_nemesis_of_dark",
        FireAndSteel: "steel_and_fire",
        DevourerOfAllSins: "devpirer_of_all_sins",
        UndoneBeThySinfulHex: "lighting_smite",
        AgainstTheFleeingLight: "agaomst_the_fleeing_light",
        TrailOfTheQilin: "trails_of_the_qilin",
        NormalAttackSecretSpearOfWangsheng: "normal_attack__secret_spear_of_wangsheng",
        SpiritSoother: "godsoother",
        FlutterBy: "hutao_passive_2",
        GuideToAfterlife: "rebirths_chaperone",
        CrimsonBouquet: "hutao_const_1",
        SanguineRouge: "hutao_passive_3",
        TheMoreTheMerrier: "hutao_passive_1",
        OminousRainfall: "hutao_const_2",
        FloralIncense: "hutao_const_5",
        LingeringCarmine: "hutao_const_3",
        GardenOfEternalRest: "hutao_const_4",
        ButterflysEmbrace: "hutao_const_6",
        LionsFangFairProtectorOfMondstadt: "lions_fang_fair_protector",
        GlacialHeart: "heart_of_the_abyss",
        StellarRestoration: "stellar_resonator",
        NormalAttackYunlaiSwordsmanship: "normal_atack_yunlai_swordmanship",
        JumpyDumpty: "jumpy_dumpy",
        ExquisiteCompound: "exquisitive_compound",
        VioletArc: "violet_ark",
        RhetoricsOfCalamitas: "rhetirucs_of_calamitas",
        ExquisiteBeTheJadeOutshiningAllBeneath: "exqyusute_be_the_jade",
        NormalAttackFavoniusBladeworkMaid: "normal_attack_favonius_bladework",
        InvulnerableMaid: "invul_maid",
        FavoniusSweeperMaster: "favonuis_sweeper",
        AdeptusArtHeraldOfFrost: "adeptus_art_herald_of_the_frost",
        AGlimpseIntoArcanum: "a_glimse_into_arcanum",
        ForbiddenCreationIsomer75TypeII: "forbidden_creation_isomer_75",
        AstableAnemohypostasisCreation6308: "astable_anemohypostasis_creation",
        FoulLegacyTideWithholder: "foul_legacy_tide",
        CrispyOutsideTenderInside: "crispy_outside",
        ConquerorOfEvilTamerOfDemons: "evil_conqueror_tamer_of_demons",
        AnnihilationEonBlossomOfKaleidos: "Annihilation_eon_blossom_of_kaleidos",
        ConquerorOfEvilWrathDeity: "evil_conqueror_wrath_deity",
        ConquerorOfEvilGuardianYaksha: "evil_conqueror_vigilant_yaksha",
        HenceCallThemMyOwnVerses: "hence_call_them_my_own",
        ARadRecipe: "a_bad_recipe",
        WildfireRhythm: "wildfire_rhytm",
        ScreaminForAnEncore: "screaming_for_an_encore",
        RockinInAFlamingWorld: "rockin_in_a_flaming",
        NormalAttackPastMemories: "normal_attack_foreign_ironwind",
      };
      const urls = (v: string) => {
        if (v in urlmaps) v = urlmaps[v];
        else {
          v = snakeCase(v);
        }
        const v2 = v.replace("normal_attack", "normal_atack");
        if (v2 !== v) return [`https://genshin.honeyhunterworld.com/img/skills/${v2}_70.png`, `https://genshin.honeyhunterworld.com/img/skills/${v}_70.png`];
        return [`https://genshin.honeyhunterworld.com/img/skills/${v}_70.png`];
      };
      let noitem = true;
      for (const url of urls(id)) {
        const isOK = await axios.head(url, { timeout: 5e3 }).catch(() => {});
        if (isOK) {
          const file = await axios.get(url, { responseType: "arraybuffer" });
          await fs.writeFile(fn, file.data);
          consola.success(`write ${id}.png`);
          noitem = false;
          break;
        }
      }
      if (noitem) {
        consola.error(`not found ${item.type}: ${item.name} in ${item.char} (${id})`);
      }
    };
    const jobfiles = items.slice(i, i + TH);
    await Promise.all(jobfiles.map(job));
  }

  return;
}

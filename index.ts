// 数据处理
import chalk from "chalk";
import { program } from "commander";

program.version("0.0.1");
program
  .command("clear")
  .description("清空")
  .action(async args => {
    await runCommand("clear");
  });
program
  .command("parse")
  .aliases(["p"])
  .description("处理")
  .option("-o, --output", "输出到content目录")
  .option("--icon", "处理icon")
  .option("-a, --avatar", "处理char")
  .option("-c, --curve", "处理curve")
  .option("-w, --weapon", "处理weapon")
  .option("-i, --item", "处理item")
  .option("-I, --itemimg", "处理itemimg")
  .option("-e, --enemy", "处理enemy")
  .option("-m, --misc", "处理misc")
  .option("-r, --relic", "处理relic")
  .option("-R, --relicimg", "处理relicimg")
  .option("-S, --skillimg", "处理skillimg")
  .option("-d, --dungeon", "处理dungeon")
  .option("-l, --locale", "处理i18n locales")
  .action(async args => {
    // 输出前清理
    if (args.output) {
      console.log(`${chalk.green("[CLI]")} clear for content...`);
      await runCommand("clear");
    }

    // 对象处理
    if (args.icon) {
      console.log(`${chalk.green("[CLI]")} processing icon...`);
      await runCommand("icon");
    }
    if (args.curve) {
      console.log(`${chalk.green("[CLI]")} processing curve...`);
      await runCommand("curve");
    }
    if (args.weapon) {
      console.log(`${chalk.green("[CLI]")} processing weapon...`);
      await runCommand("weapon");
    }
    if (args.item) {
      console.log(`${chalk.green("[CLI]")} processing items...`);
      await runCommand("item");
    }
    if (args.itemimg) {
      console.log(`${chalk.green("[CLI]")} processing itemimg...`);
      await runCommand("itemimg");
    }
    if (args.relicimg) {
      console.log(`${chalk.green("[CLI]")} processing relicimg...`);
      await runCommand("relicimg");
    }
    if (args.enemy) {
      console.log(`${chalk.green("[CLI]")} processing enemy...`);
      await runCommand("enemy");
    }
    if (args.avatar) {
      console.log(`${chalk.green("[CLI]")} processing charactors...`);
      await runCommand("avatar");
    }
    if (args.misc) {
      console.log(`${chalk.green("[CLI]")} processing misc...`);
      await runCommand("misc");
    }
    if (args.relic) {
      console.log(`${chalk.green("[CLI]")} processing relic...`);
      await runCommand("relic");
    }
    if (args.skillimg) {
      console.log(`${chalk.green("[CLI]")} processing skillimg...`);
      await runCommand("skillimg");
    }
    if (args.dungeon) {
      console.log(`${chalk.green("[CLI]")} processing dungeon...`);
      await runCommand("dungeon");
    }
    if (args.locale) {
      console.log(`${chalk.green("[CLI]")} processing i18n...`);
      await runCommand("i18n");
    }

    /// 输出
    if (args.output) {
      console.log(`${chalk.green("[CLI]")} output to content...`);
      await runCommand("output");
    }
  });
program.parse(process.argv);

function runCommand(name: string): Promise<any> {
  return require("./commands/" + name).run();
}

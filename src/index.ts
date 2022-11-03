import yargs from "yargs";
import * as yaml from "js-yaml";
import { readFileSync } from "fs";

const args = yargs
  .options({
    "config-file": {
      describe: "config file path",
      alias: "c",
      type: "string",
      require: true,
    },
  })
  .parseSync();

const config = yaml.load(readFileSync(args["config-file"], "utf-8"));

console.log(args["config-file"]);

console.log(yaml.dump(config));

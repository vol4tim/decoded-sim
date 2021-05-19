import { initApi } from "./api";
import Robot from "./robot";
import { ROBOT } from "../config.json";

async function app() {
  const api = await initApi();
  const robot = new Robot(ROBOT, api);
  robot.listen();
}
app();

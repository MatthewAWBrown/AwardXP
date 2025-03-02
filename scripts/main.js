import { CombatXPHandler } from "./CombatXPHandler.js";
import { DistributeXPButton } from "./DistributeXPButton.js";

Hooks.once("init", () => {
    console.log("Distribute XP Module Initialized!");
    DistributeXPButton.init();
    CombatXPHandler.init();
});
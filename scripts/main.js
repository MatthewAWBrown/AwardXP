import { CombatXPHandler } from "./combatXPHandler.js";
import { DistributeXPButton } from "./distributeXpButton.js";

Hooks.once("init", () => {
    console.log("Distribute XP Module Initialized!");
    DistributeXPButton.init();
    new CombatXPHandler;
});
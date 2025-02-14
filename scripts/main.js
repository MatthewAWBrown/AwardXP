Hooks.on("ready", () => {
    console.log("Award XP is loaded");

    Hooks.on("renderActorDirectory", (app, html) => {
        const button = $(`<button class="award-xp-btn"><i class="fas fa-star"></i>Award XP</button>`);

        button.click(() => {
            let selectedActors = game.actors?.filter(a => a.isOwner && a.type === "character");
            if (!selectedActors.length) {
                ui.notifications.warn("No characters selected.");
                return;
            }

            let xpToAward = 100;
            selectedActors.forEach(actor => {
                let currentXP = actor.system.details.xp?.value || 0;
                actor.update({"system.details.xp.value": currentXP + xpToAward});
                ui.notifications.info(`${actor.name} gains ${xpToAward} XP!`);
            });
        });

        html.find(".directory-header").append(button);
    });
});
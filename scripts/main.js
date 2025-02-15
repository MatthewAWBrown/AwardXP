Hooks.once("ready", () => {
    console.log("Award XP is loading...");

    // Force Actor Director to render to ensure button is added
    Hooks.call("renderActorDirectory", game.actors.directory, $(".directory.actor-directory"));
});

Hooks.on("renderActorDirectory", (app, html) => {
    // let header = html.find(".directory-header .header-actions");
    // if (!header.length){
    //     console.warn("Header not found in Actor Directory.");
    //     header = html.find(".directory-header");
    // }

    console.log("Readering Actor Directory...");
    if (html.find(".award-xp-btn").length){
        return;
    }

    const button = $(`<button class="award-xp-btn"><i class="fas fa-star"></i>Award XP</button>`);

    button.click(() => {
        let playerCharacters = game.actors?.filter(a => a.isOwner && a.type === "character");
        if (!playerCharacters.length) {
            ui.notifications.warn("No player characters found.");
            return;
        }

        // let xpToAward = 100; // Default XP amount
        // selectedActors.forEach(actor => {
        //     let currentXP = actor.system.details.xp?.value || 0;
        //     actor.update({ "system.details.xp.value": currentXP + xpToAward });
        //     ui.notifications.info(`${actor.name} gains ${xpToAward} XP!`);
        //  });
        //};

        let content = `<form>
            <div class="form-group">
                <label>XP to distribute:</label>
                <input type="number" id="xp-amount" value="100" min="0" />
            </div>
            <div class="form-group">
                <label>Select Characters:</label>
                ${playerCharacters.map(a => `<div><input type="checkbox" class="xp-target" data-id="${a.id}" checked> ${a.name}</div>`).join('')}
            </div>
        </form>`;

        new Dialog({
            title: "Award XP",
            content: content,
            buttons: {
                award: {
                    label: "Award XP",
                    callback: (html) => {
                        let xpAmount = parseInt(html.find("#xp-amount").val());
                        let selectedActors = html.find(".xp-target:checked").map((_, el) => game.actors.get(el.dataset.id)).get();

                        if(selectedActors.length === 0) {
                            ui.notifications.warn("No characters selected.");
                            return;
                        }

                        let xpPerCharacter = Math.floor(xpAmount / selectedActors.length);
                        selectedActors.forEach(actor => {
                            let currentXP = actor.system?.details?.xp?.value || 0;
                            if (currentXP === undefined) {
                                ui.notifications.warn(`Could not find XP for ${actor.name}. Check system data structure.`);
                                return;
                            }
                            actor.update({ "system.details.xp.value": currentXP + xpPerCharacter });
                            //ui.notifications.info(`${actor.name} gains ${xpPerCharacter} XP!`);
                            ChatMessage.create({
                                content: `<Strong>${actor.name}</Strong> gains <strong>${xpPerCharacter} XP!</strong>`,
                                speaker: { alias: "Game Master" }
                            });
                        });
                    }
                },
                cancel: {
                    label: "Cancel"
                }
            }
        }).render(true);
    });

    let header = html.find(".directory-header .header-actions");
    if (!header.length) {
        header = html.find(".directory-header");
    }

    if (header.length) {
        header.append(button);
        console.log("Award XP button added to Actor Directory.");
    } else {
        console.warn("Cound not find header element to append the button. Check the DOM structure.");
    }
});
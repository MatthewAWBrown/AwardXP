const PATH = `modules/AwardXP`;

export class DistributeXPButton {

    static init() {
        Hooks.once("read", () => {
            Hooks.call("renderActorDirectory", game.actors.directory, $(".directory.actor-directory"));
        });
        Hooks.on("renderActorDirectory", this._onRenderActorDirectory);
    }

    static _onRenderActorDirectory(app, html) {
        console.log("Rendering Actor Directory...");
        if (html.find(".award-xp-btn").length) return;

        const button = $(`
            <button class="award-xp-btn"><i class="fas fa-star"></i> Award XP</button>
        `);
        button.click(async () => await DistributeXPButton._openXPDialog());

        let header = html.find(".directory-header .header-actions");
        if (!header.length) header = html.find(".directory-header");

        if (header.length) {
            header.append(button);
            console.log("Award XP button added to Actor Directory.");
        } else {
            console.warn("Could not find header element to append the button. Check the DOM structure.");
        }
    }

    static async _openXPDialog() {
        const playerCharacters = game.actors?.filter(a => a.isOwner && a.type === "character");
        if (!playerCharacters.length) {
            ui.notifications.warn("No player characters found!");
            return;
        }

        const content = await renderTemplate(`${PATH}/templates/awardXPDialog.hbs`, { playerCharacters });

        new Dialog({
            title: "Award XP",
            content: content,
            buttons: {
                award: {
                    label: "Award XP",
                    callback: html => this._awardXP(html)
                },
                cancel: {
                    label: "Cancel",
                    callback: () => {}
                }
            }
        }).render(true);
    }

    static async _awardXP(html) {
        const xpAmount = parseInt(html.find("#xp-amount").val());
        const selectedActors = html.find(".xp-target:checked")
            .map((_, el) => game.actors.get(el.dataset.id))
            .get();

        if (selectedActors.length === 0) {
            ui.notifications.warn("No characters selected!");
            return;
        }

        for (const actor of selectedActors) {
            await this.applyXP(actor, xpAmount); 
        }

        await this.outputToChat(`
            <p><strong>Experience awarded!</strong> (${xpAmount} XP)</p>
            <p>given to:</p>
            <ul>
                ${selectedActors.map(actor => `<li>${actor.name}</li>`).join("")}
            </ul>    
        `);
    }

    static async applyXP(actor, amount) {
        return await actor.update({
            "system.details.xp.value": actor.system.details.xp.value + amount
        });
    }

    static async outputToChat(content) {
        await ChatMessage.create({
            user: game.userId,
            speaker: { alias: "Award XP" },
            content,
            type: CONST.CHAT_MESSAGE_TYPES.OTHER 
        });
    }
}
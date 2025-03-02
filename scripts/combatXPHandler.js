const PATH = `modules/AwardXP`;

export class CombatXPHandler {

    static async init() {
        console.log("CombatXPHandler initialized...");
        Hooks.on("renderDialog", async (app, html, data) => {
            if (app.data?.title === game.i18n.localize("COMBAT.EndTitle")) {
                CombatXPHandler._onRenderDialog(app, html, data);
            }
        });
    }

    static _onRenderDialog(app, html, data) {

        console.log("Running CombatXPHandler...");

        const dialogContent = html.find("div.dialog-content");
        const confirmBtn = html.find("button[data-button='yes']");
        const xpCheckboxGroup = $(`<div class="form-group"><label class="xp-checkbox">Award XP?<input type="checkbox" name="award-xp"></label></div>`);

        dialogContent.after(xpCheckboxGroup);

        app.setPosition(mergeObject(app.position, {height: app.position.height + 30}));

        confirmBtn.on("click", event => {
            const xpCheckbox = xpCheckboxGroup.find("input");

            if (xpCheckbox.is(":checked")) {
                Hooks.once("preDeleteCombat", (combat, options, userId) => {
                    CombatXPHandler._combatXPHandler(combat);

                    return false;
                });
            }
        });
    }

    /**
     * Distributes XP to the living PCs in the turn tracker based on enemies killed
     * @param {Object} combat -- the combat instance being deleted
     */
    static async _combatXPHandler(combat){
        console.log("Running _combatXPHandler...");
        console.log("Combat ID:", combat.id);
        console.log("Number of combatants:", combat.turns.length);
        const defaultMultiplier = 1;
        const enemies = [];
        const allies = [];
        const defaultSelectedAllies = [];

        for (const turn of combat.turns) {
            const turnData = {
                actor: turn.actor,
                token: turn.token,
                name: turn.name,
                img: turn.img
            };

            switch (turn.token.disposition) {
                case -1:
                    enemies.push(turnData);
                    continue;

                case 1:
                    allies.push(turnData);
                    const deselectByDefault = turn.actor.getFlag("AwardXP", "CombatXPHandler.deselectByDefault");

                    if (!deselectByDefault) defaultSelectedAllies.push(turnData);

                    continue;

                default:
                    continue;
            }
        }

        const combatData = { combat, defaultMultiplier, enemies, allies, defaultSelectedAllies };
        const content = await renderTemplate(`${PATH}/templates/distributeXPDialog.hbs`, combatData);

        new Dialog({
            title: "XP",
            content,
            render: html => this._distributeDialogRender(html),
            buttons: {
                okay: {
                    label: "OK",
                    //callback: html => this._distributeXP(html, combatData)
                    callback: async(html) => {
                        await CombatXPHandler._distributeXP(html, combatData);
                        console.log("Distributing XP...");
                    }
                },
                cancel: {
                    label: "Cancel",
                    callback: () => {}
                }
            }
        }).render(true);
    }

    /**
     * Sets up handlers for the XP distribution dialog
     * @param {*} html -- html for the distribution config dialog
     */

    static _distributeDialogRender(html){
        // Tab control
        html.find(".tabs").on("click", ".item", function() {
            const selectedTab = $(this).data("tab");
            html.find(".tabs .item.active").removeClass("active");
            $(this).addClass("active");
            html.find("#actor-select-tabs > div").css({ display: "none" });
            html.find(`#actor-select-tabs > div[data-tab="${selectedTab}"]`).css({ display: "" });
        });

        // Name hover tooltip for all creatures
        html.find('.distribute-xp--actor-list label').on("mouseover", function() {
            html.find('#hovered-creature').text($(this).data("actorName"));
        });
        html.find('.distribute-xp--actor-list label').on("mouseout", function() {
            html.find('#hovered-creature').html("$nbsp;");
        });

        // When a creature is selected/deselected or XP modifier is updated, recalc everything
        html.find('#xp-modifier, .distribute-xp--actor-list input').on("input", updateXp);

        // Initial XP calculation
        updateXp();

        function updateXp() {
            const defaultMultiplier = +html.find('#xp-modifier').val();

            let totalXp = 0;
            html.find("#enemy-actor-list [data-xp-amount]").each((_, el) => {
                // Update XP amount on each enemy's display with modifier
                let enemyXp = Math.floor($(el).data("xpAmount") * defaultMultiplier);
                $(el).find('.distribute-xp--actor-xp').text(`+${enemyXp} XP`);

                // If enemy is selected, add XP to total
                if ($(el).find("input").is(":checked")) {
                    totalXp += enemyXp;
                }
            });

            // Count players receiving, and work out per-player amount
            const numDivisors = html.find("#allied-actor-list input:checked").length;
            const xpPerDivisor = numDivisors !== 0 ? Math.floor(totalXp / numDivisors) : 0;
            
            // Update text for each allied token icon
            html.find("#allied-actor-list label").each((_, el) => {
                const distributeXp = $(el).find("input").is(":checked");
                $(el).find(".distribute-xp--actor-xp").text(`+${distributeXp ? xpPerDivisor : 0} XP`);
            });

            // update totals at bottom
            html.find('#total-xp').text(totalXp);
            html.find('#ally-receive-count').text(numDivisors);
            html.find('#divisor-xp').text(xpPerDivisor);
            
        }
    }

    /**
     * Handles OK button on the distribution config dialog and awards XP to selected allies
     * @param {*} html -- html for the distribution config dialog
     * @param {*} combat -- the combat instance being deleted
     */
    static async _distributeXP(html, { combat, allies }) {
        console.log("XP Distribution triggered...");
        console.log("Combat ID:", combat.id);
        console.log("Number of allies:", allies.length);

        const getSelectedTokens = type => html.find(`#${type}-actor-list label`).has("input:checked").map((_, el) => canvas.tokens.get($(el).data("tokenId"))).get();
        const selectedAlliedTokens = getSelectedTokens("friendly");
        const selectedHostileTokens = getSelectedTokens("hostile");
        let defaultMultiplier = +html.find("#xp-modifier").val();

        if(selectedHostileTokens.length === 2) defaultMultiplier = 1.5;
        else if (selectedHostileTokens.length >= 3 && selectedHostileTokens.length <= 6) defaultMultiplier = 2;
        else if (selectedHostileTokens.length >= 7 && selectedHostileTokens.length <= 10) defaultMultiplier = 2.5;
        else if (selectedHostileTokens.length >= 11 && selectedHostileTokens.length <= 14) defaultMultiplier = 3;
        else if (selectedHostileTokens.length >= 15) defaultMultiplier = 4;

        if (selectedAlliedTokens.length !== 0 && selectedHostileTokens.length !== 0) {
            const totalXp = selectedHostileTokens.reduce((total, token) => total + token.actor.system.details.xp.value, 0) * defaultMultiplier;
            const perAlly = Math.floor(totalXp / selectedAlliedTokens.length);

            for (const ally of selectedAlliedTokens) {
                await this.applyXP(ally.actor, perAlly);
            }

            await this.outputToChat(`
                <p><strong>Experience awarded!</strong> (${totalXp} XP)</p>
                <p><strong>${perAlly} XP</strong> given to:</p>
                <ul>
                    ${selectedAlliedTokens.map(({actor}) => `<li>${actor.name}</li>`).join("")}
                </ul>
            `);

            let levelUps = selectedAlliedTokens.filter(({ actor }) => actor.system.details.xp.value >= actor.system.details.xp.max);
            if (levelUps.length) {
                await this.outputToChat(`
                    <p><strong>Level ups!</strong></p>
                    <p>The following characters have enough XP to level up:</p>
                    <ul>
                        ${levelUps.map(({actor}) => `<li>${actor.name}</li>`).join("")}
                    </ul>
                `);
            }
        }

        // If there are any deselected allies, add a flag to them to not select them by default next time
        // If any selected allies DO have the deselect by default flag, clear it
        // E.G., if a summon/companion is deselected, learn to not select it by default next time
        /**  @todo: Change this to a setting feature, RAW companions/summons should be considered for XP division */

        // for (const ally of allies) {
        //     const hasFlag = allies.actor.setFlag(NAME, FLAGS.distributeXP.deselectByDefault, true);
        //     const isSelected = selectedAlliedTokens.find(selected => selected.actor.id === allied.actor.id);

        //     if (!hasFlag && !isSelected) {
        //         await allied.actor.setFlag(NAME, FLAGS.distributeXP.deselectByDefault, true);
        //     } else if (hasFlag && isSelected) {
        //         await allied.actor.unsetFlag(NAME, FLAGS.distributeXP.deselectByDefault);
        //     }
        // }

        // Now creatures have been updated, actually delete combat
        await combat.delete();
    }

    /**
     * Applies XP to the given actor
     * @param {*} actor
     */

    static async applyXP(actor, amount) {
        console.log(`Applying ${amount} XP to ${actor.name}.`);
        
        return await actor.update({
            "system.details.xp.value": actor.system.details.xp.value + amount
        });
    }

    /**
     * Creatres a chat message and outputs to chat
     */
    static async outputToChat(content) {
        console.log("Sending chat message:", content);

        const user = game.userId,
            alias = "Award XP",
            type = CONST.CHAT_MESSAGE_TYPES.OTHER;

        await ChatMessage.create({
            user,
            speaker: {
                alias
            },
            content,
            type
        });
    }

}
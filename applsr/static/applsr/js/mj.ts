/// <reference path="lsr.d.ts" />

let remove_char_timeout: null | number = null;
var remove_char_ok = false;


function deleteCharacterView(pnjElement: HTMLElement) {
    if(remove_char_ok == false) {
        remove_char_ok = true;
        document.querySelectorAll(".character .controls .delete").forEach(btn => {
            btn.classList.replace("disabled", "enabled");
        });
        remove_char_timeout = setTimeout(() => {
            remove_char_ok = false;
            document.querySelectorAll(".character .controls .delete").forEach(btn => {
                btn.classList.replace("enabled", "disabled");
            });
        }, 5000);
    }
    else {
        if(remove_char_timeout != null) {
            clearTimeout(remove_char_timeout);
        }
        remove_char_timeout = setTimeout(() => {
            remove_char_ok = false;
            document.querySelectorAll(".character .controls .delete").forEach(btn => {
                btn.classList.replace("enabled", "disabled");
            });
        }, 5000);
        pnjElement.parentElement?.removeChild(pnjElement);
        console.log("remove char", pnjElement.dataset.id);
        document.querySelectorAll<HTMLButtonElement>('.char-select button[data-cid="' + pnjElement.dataset.id + '"]').forEach(b => b.disabled = false); // using forEach as ifPresent
    }
}

// TODO should probably have an object representing the actual action, for example we should not take the fact that power was used from the character but from the action
function applyActionCosts(char: LocalCharacterView, action: RollType) {
    if(action == 'magic') {
        char.debt.current += 1;
    }
    if(action == 'arcana' || action == "arcana-essence" || action == "arcana-spirit") {
        char.arcana.current -= 1;
    }
    if(char.focus.enabled) {
        char.focus.current -= 1;
    }
    if(char.power.enabled) {
        char.power.current -= 1;
        char.debt.current += 1;
    }
}


function actionToStatValue(char: LocalCharacterView, action: RollType): number {
    if(action == "flesh") { return char.flesh.current; }
    else if(action == "spirit") { return char.spirit.current; }
    else if(action == "essence") { return char.essence.current; }
    else if(action == "death") { return 0; }
    else if(action == "magic") { return char.essence.current; }
    else if(action == "heal") { return char.essence.current; }
    else if(action == "empirical") { return 0; }
    else if(action == "arcana") { return 0; }
    else if(action == "arcana-spirit") { return char.spirit.current; }
    else if(action == "arcana-essence") { return char.essence.current; }
    assertNever(action);
}


/** Ask the server to make a roll for a given character, the character is local which means stats are completly decided on the client side */
function rollForLocalCharacterAndApplyCosts(c: LocalCharacterView, action: RollType, dc: boolean /** dés cachés */, parentRollId: string | null = null) {
    const opposition = parseInt(document.querySelector<HTMLInputElement>('#opposition')!.value);

    let stat: number = actionToStatValue(c, action);

    if(document.querySelector<HTMLInputElement>('#opposition_checked')!.checked) {
        lsrApi.rollForLocalCharacter(c, action, stat, dc, opposition, parentRollId).then(text => {
            const degats = parseInt(text);
            c.hp.current -= degats;
            updateChat();
        });
    }
    else {
        lsrApi.rollForLocalCharacter(c, action, stat, dc, 0, parentRollId)
        .then(() => updateChat());
    }

    applyActionCosts(c, action);
}


/** Get the last number in a string with separators, for example getIndexInString("a-b-c-3") would return 3 */
function getIndexInString(str: string, separator="-", byDefault: number | null = null): number | null {
    const parts = str.split(separator);
    if(parts.length == 1) {
        return byDefault;
    }
    const last = parts.pop();
    if(last === undefined) {
        return byDefault;
    }
    const i = parseInt(last);
    if(isNaN(i)) {
        return byDefault;
    }
    return i;
}


function incrementString(str: string, separator="-") {
    const i = getIndexInString(str, separator);
    if(i === null) {
        return str + separator + "1";
    }
    const parts = str.split(separator);
    const last = parts.pop();
    return parts.join(separator) + separator + (i + 1);
}


function addTempCharacter(new_pnj_name: string, new_pnj_chair: string, new_pnj_esprit: string, new_pnj_essence: string, new_pnj_pv_max: string | "PVmax", new_pnj_pf_max: string | "PFmax", new_pnj_pp_max: string | "PPmax") {
    const new_pnj_dettes = Math.floor(Math.random() * Math.floor(5));
    const liste_pnj = document.querySelector('#liste_pnj')!;
    
    if(new_pnj_name == "") {
        new_pnj_name = "Name";
    }

    if(new_pnj_chair == "") {
        new_pnj_chair = "2";
    }

    if(new_pnj_esprit == "") {
        new_pnj_esprit = new_pnj_chair;
    }

    if(new_pnj_essence == "") {
        new_pnj_essence = new_pnj_chair;
    }

    if(new_pnj_pv_max == "") {
        new_pnj_pv_max = "" + parseInt(new_pnj_chair) * 2;
    }
    if(new_pnj_pf_max == "") {
        new_pnj_pf_max = new_pnj_esprit;
    }
    if(new_pnj_pp_max == "") {
        new_pnj_pp_max = new_pnj_essence;
    }
    
    const pnjElement = createCharacter(new_pnj_name);
    pnjElement.classList.add("npc");
    const c = LocalCharacterView.fromElement(pnjElement);
    c.flesh.current = parseInt(new_pnj_chair);
    c.spirit.current = parseInt(new_pnj_esprit);
    c.essence.current = parseInt(new_pnj_essence);
    c.hp.current = parseInt(new_pnj_pv_max);
    c.hp.max = parseInt(new_pnj_pv_max);
    c.focus.current = parseInt(new_pnj_pf_max);
    c.focus.max = parseInt(new_pnj_pf_max);
    c.power.current = parseInt(new_pnj_pp_max);
    c.power.max = parseInt(new_pnj_pp_max);
    c.debt.current = new_pnj_dettes;
    c.hidden.enabled = true;
    
    liste_pnj.appendChild(pnjElement);

    document.querySelector<HTMLInputElement>("#new_pnj_name")!.value = incrementString(new_pnj_name);
}


function clearAndUpdateChat() {
    lsrApi.clearChat().then(() => updateChat());
}


function duplicateInDb(characterElement: HTMLElement) {
    let character = LocalCharacterView.fromElement(characterElement);
    lsrApi.createCharacter(character)
    .then(cdb => {
        const container = document.createElement("div");
        container.innerHTML = '<button data-cid="' + cdb.id + '" onclick="autoAddChar(this);">' + cdb.name + '</button>';

        let categoryElement = document.querySelector<HTMLElement>(".char-select .category-" + cdb.category);

        if(categoryElement == null) {
            const charSelect = document.querySelector<HTMLElement>(".char-select")!;
            const container = document.createElement("div");
            container.innerHTML = '<div class="category-' + character.category.current + '"><summary class="label">' + character.category.current + '</summary><div class="content"></div></div>';
            categoryElement = container.firstElementChild! as HTMLElement;
            charSelect.appendChild(categoryElement);
        }

        categoryElement.querySelector(".content")!.appendChild(container.firstElementChild!);
    });
}


function duplicateAsTempCharacter(characterElement: HTMLElement) {
    const liste_pnj = document.querySelector('#liste_pnj')!;
    const offlineChar = characterElement.cloneNode(true) as HTMLElement;
    offlineChar.classList.add("npc");
    delete offlineChar.dataset.id;

    // find correct number to suffix the character, aka the highest suffix already present on the page
    const ids = Array.from(document.querySelectorAll(".character .name .current")).map(e => getIndexInString(e.innerHTML, "-", 0)!).sort();

    if(ids.length !== 0) {
        let c = LocalCharacterView.fromElement(offlineChar);
        c.name.current = c.name.current + "-" + (ids[ids.length - 1] + 1);
    }

    liste_pnj.appendChild(offlineChar);
}


function autoAddChar(source: HTMLButtonElement) {
    const pcList = document.querySelector<HTMLElement>("#liste_pj")!;
    // TODO this cast should be removed, this function is too top level to have it
    pcList.appendChild(createCharacterByCid(source.dataset.cid! as unknown as CharId));
    updateCharactersOnPage();
    source.disabled = true;
}


function autoFilter(source: HTMLInputElement) {
    document.querySelectorAll<HTMLButtonElement>(".char-select .content button").forEach(b => {
        if(b.innerHTML.indexOf(source.value) === -1) {
            b.style.display = "none";
        }
        else {
            b.style.display = "initial";
        }
    });
}

// Helpers condivisi per salvataggi, perk e punti (riutilizzabili da shop/altre pagine)
(function (global) {
    const PERKS_SHARED = [
        { id: 'rapid', name: 'Rapid Fire', cost: 120, max: 5 },
        { id: 'health', name: 'Toughness', cost: 150, max: 5 },
        { id: 'speed', name: 'Scout', cost: 140, max: 3 },
        { id: 'magnet', name: 'Magnet', cost: 160, max: 4 },
        { id: 'greed', name: 'Greed', cost: 200, max: 3 }
    ];

    function loadSave() {
        let data = JSON.parse(localStorage.getItem('arctic_save') || '{}');
        if (!data.levels) data.levels = {};
        if (typeof data.score !== 'number') data.score = 2000; // default coerente col gioco
        PERKS_SHARED.forEach(p => { if (data.levels[p.id] === undefined) data.levels[p.id] = 0; });
        return data;
    }

    function save(data) {
        localStorage.setItem('arctic_save', JSON.stringify(data));
    }

    function addMoney(amount = 500) {
        const data = loadSave();
        data.score += amount;
        save(data);
        return data.score;
    }

    function buyPerk(id) {
        const data = loadSave();
        const perk = PERKS_SHARED.find(p => p.id === id);
        if (!perk) return { ok: false, reason: 'unknown_perk' };
        const lvl = data.levels[id] || 0;
        if (lvl >= perk.max) return { ok: false, reason: 'maxed' };
        const cost = perk.cost * (lvl + 1);
        if (data.score < cost) return { ok: false, reason: 'no_funds', cost };
        data.score -= cost;
        data.levels[id] = lvl + 1;
        save(data);
        return { ok: true, lvl: data.levels[id], cost, score: data.score };
    }

    global.sharedSave = {
        loadSave,
        save,
        addMoney,
        buyPerk,
        perks: PERKS_SHARED
    };
})(window);

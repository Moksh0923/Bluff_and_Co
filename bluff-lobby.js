/* UI glue for the Bluff waiting lobby. Loaded after bluff.js.
   bluff.js still builds the lobby (code, roster, count, status, Start/Copy/Leave). This file only
   - decorates the roster rows it renders (avatar, host/you badges, empty seats, count meter),
   - mirrors the room status into the header pill and waiting indicator,
   - adds "Copy invite link" / "Share", which open bluff.html?action=join&code=XXXXX.
   Nothing here creates, joins or starts a game, and nothing here talks to the network. */
(function () {
    var $ = function (id) { return document.getElementById(id); };

    var view = $("roomView"), roster = $("roster"), codeEl = $("partyCode");
    if (!view || !roster || !codeEl) return;

    var startBtn = $("startBtn"), stateEl = $("lobState"), meter = $("lobMeter");
    var linkBtn = $("linkBtn"), shareBtn = $("shareBtn");

    function limits() {
        var r = typeof RULES !== "undefined" ? RULES : {};
        return { min: r.minPlayers || 2, max: r.maxPlayers || 8 };
    }

    function hue(name) {
        var h = 0;
        for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
        return h;
    }

    function mk(tag, cls, text) {
        var n = document.createElement(tag);
        if (cls) n.className = cls;
        if (text !== undefined) n.textContent = text;
        return n;
    }

    /* ---- room code and invitation link ---- */
    function currentCode() {
        var c = codeEl.textContent.trim();
        return /^[A-Z0-9]{5}$/.test(c) ? c : "";
    }

    function inviteUrl(c) {
        var u = new URL(location.href);
        u.search = "";
        u.hash = "";
        u.searchParams.set("action", "join");
        u.searchParams.set("code", c);
        return u.toString();
    }

    function flash(btn, text, original) {
        btn.textContent = text;
        setTimeout(function () { btn.textContent = original; }, 1800);
    }

    if (linkBtn) {
        linkBtn.addEventListener("click", function () {
            var c = currentCode();
            if (!c) return;
            var url = inviteUrl(c);
            var original = "Copy invite link";
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(url).then(
                    function () { flash(linkBtn, "Link copied", original); },
                    function () { window.prompt("Copy this invitation link:", url); }
                );
            } else {
                window.prompt("Copy this invitation link:", url);
            }
        });
    }

    if (shareBtn) {
        if (navigator.share) shareBtn.hidden = false;
        shareBtn.addEventListener("click", function () {
            var c = currentCode();
            if (!c) return;
            navigator.share({
                title: "Join my Bluff game",
                text: "Join my Bluff room. Code: " + c,
                url: inviteUrl(c)
            }).catch(function () { /* cancelled */ });
        });
    }

    /* ---- decorate whatever bluff.js rendered ---- */
    var obs = new MutationObserver(refresh);
    function watch() {
        obs.observe(roster, { childList: true });
        obs.observe(codeEl, { childList: true, characterData: true, subtree: true });
    }

    function refresh() {
        obs.disconnect();                       // our own DOM changes must not retrigger us
        try { decorate(); } finally { watch(); }
    }

    function decorate() {
        var lim = limits();

        // slots left over from a previous pass
        [].forEach.call(roster.querySelectorAll(".lob-slot"), function (n) { n.remove(); });

        var rows = roster.querySelectorAll(".roster-row");
        [].forEach.call(rows, function (li) {
            if (li.dataset.dec) return;
            li.dataset.dec = "1";

            var nameEl = li.querySelector(".roster-name");
            var name = nameEl ? nameEl.textContent : "";
            var av = mk("span", "lob-av", (name.trim().charAt(0) || "?").toUpperCase());
            av.setAttribute("aria-hidden", "true");
            av.style.setProperty("--h", hue(name));
            li.insertBefore(av, li.firstChild);

            var tag = li.querySelector(".roster-tag");
            if (tag) {
                var box = mk("span", "lob-tags");
                tag.textContent.split("·").forEach(function (part) {
                    var p = part.trim();
                    if (!p) return;
                    var isHost = p.toLowerCase() === "host";
                    box.appendChild(mk("span", "lob-tag " + (isHost ? "is-host" : "is-you"), p));
                    li.classList.add(isHost ? "is-host" : "is-me");
                });
                li.replaceChild(box, tag);
            }
        });

        var count = rows.length;

        // empty seats: fill up to the minimum, then always keep one open seat as an invitation
        var open = count === 0 ? 0 : (count < lim.min ? lim.min - count : (count < lim.max ? 1 : 0));
        for (var i = 0; i < open; i++) {
            var slot = mk("li", "lob-slot");
            slot.setAttribute("aria-hidden", "true");
            var ph = mk("span", "lob-av", "?");
            var label = mk("span", "", "Waiting for player");
            var dots = mk("span", "lob-dots");
            dots.append(mk("i"), mk("i"), mk("i"));
            slot.append(ph, label, dots);
            roster.appendChild(slot);
        }

        if (meter) meter.style.width = Math.min(100, (count / lim.max) * 100) + "%";

        // status pill + waiting indicator colour
        var isHostView = !!startBtn && !startBtn.hidden;
        var ready = isHostView && !startBtn.disabled;
        view.dataset.ready = ready ? "1" : "0";
        if (stateEl) {
            stateEl.textContent = count === 0 ? "Creating room…"
                : ready ? "Ready to start"
                : isHostView ? "Waiting for players"
                : "Waiting for the host";
        }

        var hasCode = !!currentCode();
        if (linkBtn) linkBtn.disabled = !hasCode;
        if (shareBtn) shareBtn.disabled = !hasCode;
    }

    refresh();
})();

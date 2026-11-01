/* UI glue for the Bluff entry page. Loaded after bluff.js.
   It creates and joins nothing itself: every real action still runs through bluff.js
   (startHosting, joinRoom, readName, the PeerJS code). This file only
   - runs the mobile nav and the live name avatar,
   - lets the join code be typed on the main entry screen: it copies the code into the
     existing #codeInput and submits the existing #joinForm,
   - handles ?action=host / ?action=join deep links from the homepage.
   If anything here is missing, the original buttons fall back to their normal behaviour. */
(function () {
    var $ = function (id) { return document.getElementById(id); };

    var lobby = $("lobby"), name = $("nameInput"), av = $("entAv");
    var hostBtn = $("hostBtn"), joinBtn = $("joinBtn");
    var code = $("lobbyCode"), codeErr = $("lobbyCodeError");
    var realCode = $("codeInput"), realForm = $("joinForm");

    /* ---- mobile nav ---- */
    var toggle = $("enToggle"), links = $("enLinks");
    if (toggle && links) {
        var closeMenu = function () { links.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); };
        toggle.addEventListener("click", function () {
            var open = links.classList.toggle("open");
            toggle.setAttribute("aria-expanded", open ? "true" : "false");
        });
        links.addEventListener("click", function (e) { if (e.target.closest("a")) closeMenu(); });
        document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });
    }

    if (!lobby || !name || !hostBtn || !joinBtn || !code) return;

    /* ---- live avatar next to the name (same colour rule as the in-game avatar) ---- */
    function paintAv() {
        if (!av) return;
        var n = name.value.trim(), h = 0;
        for (var i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) % 360;
        av.textContent = n ? n.charAt(0).toUpperCase() : "?";
        av.style.setProperty("--h", n ? h : 268);
    }
    name.addEventListener("input", paintAv);
    paintAv();

    /* ---- join code typed on the entry screen ---- */
    code.addEventListener("input", function () {
        code.value = code.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
        code.removeAttribute("aria-invalid");
        codeErr.textContent = "";
    });
    code.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); joinBtn.click(); }
    });

    // Capture phase, so this runs before bluff.js's own joinBtn handler (which would send the
    // person to the separate join screen). It is skipped if the bluff.js functions aren't there.
    lobby.addEventListener("click", function (e) {
        if (!e.target.closest("#joinBtn")) return;
        if (typeof readName !== "function" || !realCode || !realForm) return;   // fall back to the original flow
        e.stopPropagation();

        if (readName() === null) return;                                         // shows "Enter your name first."

        var len = typeof CODE_LENGTH !== "undefined" ? CODE_LENGTH : 5;
        var c = code.value.trim().toUpperCase();
        if (c.length !== len) {
            codeErr.textContent = "Enter the " + len + "-character code from the host.";
            code.setAttribute("aria-invalid", "true");
            code.focus();
            return;
        }

        // Only show the busy state when a connection will really start. If PeerJS failed to load,
        // bluff.js shows its own "couldn't load" message and the button must stay usable.
        if (typeof Peer !== "undefined") {
            joinBtn.disabled = true;
            joinBtn.textContent = "Connecting\u2026";
        }
        realCode.value = c;
        // Same path as pressing Join on the join screen: bluff.js validates and calls joinRoom().
        realForm.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    }, true);

    // Whenever the entry screen is shown again (failed join, left a room...), reset it.
    new MutationObserver(function () {
        joinBtn.disabled = false;
        joinBtn.textContent = "Join Room";
        if (!lobby.hidden) { code.value = ""; code.removeAttribute("aria-invalid"); codeErr.textContent = ""; }
    }).observe(lobby, { attributes: true, attributeFilter: ["hidden"] });

    /* ---- deep links from the homepage ---- */
    // Coming from the homepage with ?action=host or ?action=join shows only that path:
    // name + Create Room, or name + room code + Join Room. Opening bluff.html directly
    // (no action) still shows both options.
    var action = new URLSearchParams(location.search).get("action");
    if (action === "host" || action === "join") {
        lobby.classList.add(action === "host" ? "mode-host" : "mode-join");

        var title = lobby.querySelector("h2");
        var lede = lobby.querySelector(".ent-lede");
        var rules = lobby.querySelector(".rules");
        if (action === "host") {
            if (title) title.innerHTML = 'Create your <span class="ent-grad">room</span>';
            if (lede) lede.textContent = "Pick a name and start a private game. You’ll get a code to share with your friends.";
        } else {
            if (title) title.innerHTML = 'Join a <span class="ent-grad">room</span>';
            if (lede) lede.textContent = "Pick a name and enter the 5-character code your friend shared with you.";
        }
        if (rules) rules.hidden = true;

        // Invitation links look like bluff.html?action=join&code=ABC12: pre-fill the code.
        // This only fills the field; the person still enters a name and presses Join.
        var pre = (new URLSearchParams(location.search).get("code") || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
        if (action === "join" && pre) {
            code.value = pre;
            if (lede) lede.textContent = "Your invitation code is filled in. Just pick a name and join.";
        }

        name.focus({ preventScroll: true });
        name.addEventListener("keydown", function (e) {
            if (e.key !== "Enter" || e.isComposing) return;
            e.preventDefault();
            if (action === "host") hostBtn.click();
            else if (code.value.length === 5) joinBtn.click();
            else if (name.value.trim()) code.focus();
            else joinBtn.click();   // empty name: shows the normal "Enter your name first." message
        });
    }
})();
/* Homepage behaviour only: mobile menu, nav shadow on scroll, scroll-reveal.
   Create/Join Room are plain links into bluff.html; no room logic lives here. */
(function () {
    document.documentElement.classList.add("js");

    var nav = document.getElementById("nav");
    var toggle = document.getElementById("navToggle");
    var links = document.getElementById("navLinks");

    toggle.addEventListener("click", function () {
        var open = links.classList.toggle("open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    links.addEventListener("click", function (e) {
        if (e.target.closest("a")) { links.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); }
    });
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") { links.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); }
    });

    function onScroll() { nav.classList.toggle("scrolled", window.scrollY > 8); }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    var items = document.querySelectorAll(".reveal");
    if ("IntersectionObserver" in window) {
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
            });
        }, { threshold: 0.15 });
        items.forEach(function (el, i) { el.style.transitionDelay = (i % 4) * 70 + "ms"; io.observe(el); });
    } else {
        items.forEach(function (el) { el.classList.add("in"); });
    }

    var yr = document.getElementById("yr");
    if (yr) yr.textContent = new Date().getFullYear();
})();

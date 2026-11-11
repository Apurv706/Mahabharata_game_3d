/* The breath test (PRD §18.7, the Varunastra's quest): dive for a sage's golden vessel on the bed of a
   deep lake. Hold to dive, let go to rise; the vessel glows on the lake bed and a current drifts it
   (and you); your breath runs out faster the deeper you are. Reach the glow, then surface with air to
   spare. Three dives; bring it up on `need` (2) to win.
   trial: { dives (3), need (2), secs (breath, 12), verb ("Dive") }. Played on the lake painting: the
   water fills the screen, darker with depth; your puppet (fold pose) sinks and rises; the vessel's
   glow and the breath bar sit over it. Under the test harness the frame rolls instead (U.trialFrame). */
(function (K) {
  "use strict";
  const U = K.UI;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const VESSEL = '<svg viewBox="0 0 60 60" aria-hidden="true"><defs><radialGradient id="br-g" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff3c8"/><stop offset="0.5" stop-color="#ffd27a" stop-opacity="0.6"/><stop offset="1" stop-color="#ffb648" stop-opacity="0"/></radialGradient></defs>' +
    '<circle cx="30" cy="30" r="30" fill="url(#br-g)"/><path d="M20 24 Q18 44 30 46 Q42 44 40 24 Z" fill="#d9a53a" stroke="#6b4a14" stroke-width="1.5"/><path d="M18 22 H42" stroke="#6b4a14" stroke-width="2"/><path d="M24 18 Q30 12 36 18" fill="none" stroke="#6b4a14" stroke-width="1.5"/></svg>';

  U.games.breath = function (box, done, c) {
    return U.trialFrame(box, done, c, "breath", ({ host, power, t, finish, onAct, cue }) => {
      const dives = t.dives || 3, need = t.need || 2, BREATH = (t.secs || 12) + power * 0.6, REACH = clamp(0.1 + power * 0.008, 0.1, 0.16);
      let dive = 0, got = 0, depth = 0, vel = 0, x = 0.5, holding = false, air = BREATH, phase = "down", busy = false, last = 0;
      let vx = 0.62, vdir = 1, vdepth = clamp(0.78 + power * 0.01, 0.78, 0.9);
      host.innerHTML = '<p class="score" aria-live="polite"></p><div class="lake"><div class="depth"></div><div class="vessel">' + VESSEL + '</div><div class="diver">' + U.puppet(K.puppetSpec(K.S), { h: 130, pose: "fold" }) + '</div><div class="bubbles"></div></div>' +
        '<div class="breath"><span>' + U.tr("Breath") + '</span><i></i></div><p class="game-note" aria-live="polite">' + U.trSpan(t.help || "Hold to dive, let go to rise. Reach the glow, then surface before your breath is gone.") + '</p><div class="btnrow"></div>';
      const lake = host.querySelector(".lake"), diver = host.querySelector(".diver"), vessel = host.querySelector(".vessel"), bar = host.querySelector(".breath i"), score = host.querySelector(".score"), note = host.querySelector(".game-note"), depthEl = host.querySelector(".depth");
      const marks = () => { score.textContent = K.tr("Dive {n} of {m}", { n: Math.min(dive + 1, dives), m: dives }) + " · " + K.tr("Brought up: {h}", { h: got }); };
      // On the lake painting the play sits in the water, below the painting's own waterline (the
      // stage is split above and below the surface), whatever the screen's shape.
      const placeLake = () => {
        const wrap = host.closest(".trial.immersive"), pic = document.querySelector("#backdrop .bdl.on .pic");
        if (!wrap || !pic) return;
        // Only the deep lake is painted half under water; on any other stage the box stays as it was.
        if (!/stage_deep_lake/.test(pic.style.backgroundImage || "")) { wrap.classList.remove("underwater"); return; }
        wrap.classList.add("underwater");
        const r = pic.getBoundingClientRect(); if (!r.height) return;
        const tall = /_tall\./.test(pic.style.backgroundImage || "");
        const line = r.top + r.height * (tall ? 0.46 : 0.51);
        wrap.style.setProperty("--wl", Math.round(Math.max(window.innerHeight * 0.3, Math.min(window.innerHeight * 0.62, line))) + "px");
      };
      placeLake(); setTimeout(placeLake, 300); setTimeout(placeLake, 900);
      window.addEventListener("resize", placeLake);
      marks();
      const down = () => { holding = true; cue("hold"); }, up = () => { holding = false; cue("rest"); };
      host.querySelector(".btnrow").appendChild(U.pressButton(t.verb || "Dive", down, up));
      onAct(down, up);
      const endDive = (ok, why) => {
        busy = true; holding = false;
        if (ok) got++;
        dive++;
        note.textContent = K.tr(why);
        lake.classList.remove("got", "lost"); void lake.offsetWidth; lake.classList.add(ok ? "got" : "lost");
        if (K.Sound) K.Sound.play(ok ? "choose" : "quill");
        cue(ok ? "good" : "bad");
        marks();
        const left = dives - dive;
        if (got >= need || got + left < need || left === 0) return setTimeout(() => finish(got >= need ? "win" : got === need - 1 ? "close" : "lose", ["You brought the vessel up {h} times of {n}.", { h: got, n: dive }]), 700);
        setTimeout(() => { busy = false; depth = 0; vel = 0; air = BREATH; phase = "down"; x = 0.5; vdepth = clamp(0.78 + power * 0.01 + K.rng() * 0.08, 0.78, 0.92); note.textContent = ""; lake.classList.remove("got", "lost"); vessel.classList.remove("held"); }, 900);
      };
      return U.loop((s) => {
        const dt = Math.min(0.05, s - last); last = s;
        if (busy) return;
        // The vessel drifts along the bed with the current; so do you, more the deeper you are.
        vx += vdir * dt * 0.06; if (vx > 0.8 || vx < 0.2) vdir = -vdir;
        x = clamp(x + vdir * dt * 0.05 * depth + (holding ? (vx - x) * dt * 0.9 : 0), 0.05, 0.95);
        vel += (holding ? 0.9 : -1.1) * dt; vel *= 0.9;
        depth = clamp(depth + vel * dt * 1.6, 0, 1);
        if (depth === 0 || depth === 1) vel = 0;
        // Breath goes faster deep down, and comes back only at the surface.
        air -= dt * (0.35 + depth * 1.1);
        if (depth === 0 && !holding) air = Math.min(BREATH, air + dt * 2.5);
        const near = Math.abs(depth - vdepth) < REACH && Math.abs(x - vx) < REACH * 1.6;
        if (phase === "down" && near) { phase = "up"; vessel.classList.add("held"); note.textContent = K.tr("You have it. Up, now."); if (K.Sound) K.Sound.play("choose"); }
        if (phase === "up" && depth <= 0.02) return endDive(true, "You break the surface with the vessel in your hands, gasping.");
        if (air <= 0) return endDive(false, phase === "up" ? "The dark closes in a stroke from the surface, and the vessel slips from your hands." : "Your breath gives out, and you come up empty, coughing.");
        diver.style.top = (8 + depth * 72) + "%"; diver.style.left = (x * 100) + "%";
        if (phase === "up") { vessel.style.top = (8 + depth * 72 + 6) + "%"; vessel.style.left = (x * 100) + "%"; }
        else { vessel.style.top = (8 + vdepth * 72) + "%"; vessel.style.left = (vx * 100) + "%"; }
        depthEl.style.opacity = String(0.15 + depth * 0.6);
        bar.style.width = Math.max(0, air / BREATH * 100) + "%";
        bar.parentElement.classList.toggle("low", air < BREATH * 0.3);
        diver.classList.toggle("rising", phase === "up" || !holding);
      }, host);
    });
  };
})(window.K = window.K || {});

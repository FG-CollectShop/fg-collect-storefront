// Posts the cart to fg-collect-core's /checkout/session endpoint.
// Core creates a Stripe Checkout Session and returns the hosted URL.
// We redirect the browser to that URL — Stripe handles the payment UI.

(function () {
  function init() {
    var btn = document.querySelector("[data-checkout-btn]");
    var err = document.querySelector("[data-checkout-error]");
    if (!btn) return;

    btn.addEventListener("click", function () {
      err && err.classList.add("hidden");

      var apiBase = (window.FG && window.FG.apiBase) || "";
      if (!apiBase) {
        showError("Checkout is not configured yet (missing apiBase).");
        return;
      }

      var items = (window.FGCart && window.FGCart.read() || []);
      if (items.length === 0) {
        showError("Your cart is empty.");
        return;
      }

      btn.disabled = true;
      btn.textContent = "Redirecting...";

      fetch(apiBase.replace(/\/$/, "") + "/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map(function (i) {
            return { id: i.id, qty: Number(i.qty || 1) };
          }),
          successUrl: window.location.origin + "/checkout/success/",
          cancelUrl: window.location.origin + "/checkout/cancel/",
        }),
      })
        .then(function (r) {
          if (!r.ok) throw new Error("Checkout session request failed (" + r.status + ")");
          return r.json();
        })
        .then(function (data) {
          if (!data || !data.url) throw new Error("Missing checkout URL in response");
          window.location.href = data.url;
        })
        .catch(function (e) {
          showError(e.message || "Something went wrong. Try again in a moment.");
          btn.disabled = false;
          btn.textContent = "Checkout";
        });
    });

    function showError(msg) {
      if (!err) return;
      err.textContent = msg;
      err.classList.remove("hidden");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

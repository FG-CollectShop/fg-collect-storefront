// Cart lives entirely in localStorage under `fg-cart-v1`.
// Shape: [{ id, name, price, image, qty }]
// Every page loads this script; the cart page also loads checkout.js.

(function () {
  var STORAGE_KEY = "fg-cart-v1";

  function read() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function write(items) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {}
    window.dispatchEvent(new CustomEvent("fg:cart-changed", { detail: { items: items } }));
  }

  function add(product) {
    var items = read();
    var existing = items.find(function (i) { return i.id === product.id; });
    if (existing) {
      existing.qty = (existing.qty || 1) + 1;
    } else {
      items.push({
        id: product.id,
        name: product.name,
        price: Number(product.price),
        image: product.image,
        qty: 1,
      });
    }
    write(items);
  }

  function remove(id) {
    write(read().filter(function (i) { return i.id !== id; }));
  }

  function setQty(id, qty) {
    qty = Math.max(0, parseInt(qty, 10) || 0);
    if (qty === 0) return remove(id);
    var items = read();
    var item = items.find(function (i) { return i.id === id; });
    if (item) {
      item.qty = qty;
      write(items);
    }
  }

  function clear() { write([]); }

  function subtotal(items) {
    return (items || read()).reduce(function (sum, i) {
      return sum + Number(i.price) * Number(i.qty || 1);
    }, 0);
  }

  function count(items) {
    return (items || read()).reduce(function (sum, i) {
      return sum + Number(i.qty || 1);
    }, 0);
  }

  function fmt(n) { return "$" + n.toFixed(2); }

  // --- UI wiring --------------------------------------------------------

  function renderBadge() {
    var badge = document.querySelector("[data-cart-count]");
    if (!badge) return;
    var c = count();
    badge.textContent = String(c);
    badge.classList.toggle("hidden", c === 0);
    badge.classList.toggle("inline-flex", c > 0);
  }

  function renderCartPage() {
    var list = document.querySelector("[data-cart-items]");
    var empty = document.querySelector("[data-cart-empty]");
    var wrapper = document.querySelector("[data-cart-wrapper]");
    if (!list || !empty || !wrapper) return;

    var items = read();
    if (items.length === 0) {
      empty.classList.remove("hidden");
      wrapper.classList.add("hidden");
      return;
    }
    empty.classList.add("hidden");
    wrapper.classList.remove("hidden");

    list.innerHTML = items.map(function (i) {
      return (
        '<li class="p-4 flex gap-4 items-center">' +
          '<div class="w-16 h-20 bg-gray-50 flex items-center justify-center rounded overflow-hidden shrink-0">' +
            '<img src="' + i.image + '" alt="" class="object-contain w-full h-full" />' +
          '</div>' +
          '<div class="flex-1 min-w-0">' +
            '<div class="text-sm font-medium truncate">' + i.name + '</div>' +
            '<div class="text-xs text-gray-500">' + fmt(Number(i.price)) + ' each</div>' +
          '</div>' +
          '<div class="flex items-center gap-2">' +
            '<input type="number" min="1" value="' + (i.qty || 1) + '"' +
              ' data-qty-input data-id="' + i.id + '"' +
              ' class="w-16 px-2 py-1 text-sm border border-gray-300 rounded-md text-center" />' +
            '<button type="button" data-remove data-id="' + i.id + '"' +
              ' class="text-xs text-gray-500 hover:text-red-600 underline">Remove</button>' +
          '</div>' +
          '<div class="w-20 text-right font-semibold">' +
            fmt(Number(i.price) * Number(i.qty || 1)) +
          '</div>' +
        '</li>'
      );
    }).join("");

    var sub = subtotal(items);
    var subEl = document.querySelector("[data-cart-subtotal]");
    var totEl = document.querySelector("[data-cart-total]");
    if (subEl) subEl.textContent = fmt(sub);
    if (totEl) totEl.textContent = fmt(sub);
  }

  function bindAddButtons() {
    document.addEventListener("click", function (e) {
      var btn = e.target.closest && e.target.closest("[data-add-to-cart]");
      if (!btn) return;
      e.preventDefault();
      add({
        id: btn.dataset.productId,
        name: btn.dataset.productName,
        price: btn.dataset.productPrice,
        image: btn.dataset.productImage,
      });
      // Brief visual feedback
      var orig = btn.textContent;
      btn.textContent = "Added";
      btn.disabled = true;
      setTimeout(function () {
        btn.textContent = orig;
        btn.disabled = false;
      }, 900);
    });
  }

  function bindCartPageControls() {
    document.addEventListener("click", function (e) {
      var rm = e.target.closest && e.target.closest("[data-remove]");
      if (rm) { remove(rm.dataset.id); return; }
    });
    document.addEventListener("change", function (e) {
      var q = e.target.closest && e.target.closest("[data-qty-input]");
      if (q) setQty(q.dataset.id, q.value);
    });
  }

  // --- Public API -------------------------------------------------------

  window.FGCart = {
    read: read,
    add: add,
    remove: remove,
    setQty: setQty,
    clear: clear,
    subtotal: subtotal,
    count: count,
  };

  function init() {
    bindAddButtons();
    bindCartPageControls();
    renderBadge();
    renderCartPage();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.addEventListener("fg:cart-changed", function () {
    renderBadge();
    renderCartPage();
  });

  // React to cart updates from other tabs.
  window.addEventListener("storage", function (e) {
    if (e.key === STORAGE_KEY) {
      renderBadge();
      renderCartPage();
    }
  });
})();

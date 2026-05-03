const cartContainer = document.querySelector(".cart-items");
const subtotalEl = document.getElementById("subtotal");
const cartCount = document.getElementById("cart-count");
const cart = document.querySelector(".cart");
const overlay = document.querySelector(".cart-overlay");
const checkoutBtn = document.querySelector(".checkout-btn");
const cartNavbar = document.querySelector(".cart-navbar");

// ========================
// LOAD CART
// ========================
async function loadCart() {
  const res = await fetch("/cart");
  const data = await res.json();

  renderCart(data.items || []);

  if (checkoutBtn) {
    checkoutBtn.style.display =
      data.items && data.items.length ? "block" : "none";
  }
}

// ========================
// ADD TO CART
// ========================
document.addEventListener("click", async (e) => {
  const btn = e.target.closest(".add-cart");
  if (!btn) return;

  const id = btn.dataset.id;

  try {
    await fetch("/cart/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ productId: id }),
    });

    cart.classList.add("active");
    overlay.classList.add("active");

    loadCart();
  } catch (err) {
    console.error(err);
  }
});

// ========================
// OPEN CART
// ========================
cartNavbar?.addEventListener("click", () => {
  cart.classList.add("active");
});

// ========================
// RENDER CART
// ========================
function renderCart(items) {
  if (!items.length) {
    cartContainer.innerHTML = `
      <h3 style="text-align:center;margin-top:50px;">
        YOUR BAG IS EMPTY
      </h3>
    `;
    subtotalEl.textContent = "£0.00";
    cartCount.textContent = "0";
    return;
  }

  let subtotal = 0;

  cartContainer.innerHTML = items
    .map((item) => {
      const p = item.product;

      subtotal += item.priceAtTime * item.quantity;

      return `
        <div class="cart-item">
          <img src="${p.images?.[0] || ""}" />

          <div class="cart-info">
            <h4>${p.name}</h4>
            <span class="cart-price">£${item.priceAtTime.toFixed(2)}</span>
          </div>

          <div class="cart-actions">
            <i class="fa-solid fa-trash remove" data-id="${p._id}"></i>

            <div class="qty">
              <button class="minus" data-id="${p._id}">-</button>
              <span>${item.quantity}</span>
              <button class="plus" data-id="${p._id}">+</button>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  subtotalEl.textContent = "£" + subtotal.toFixed(2);
  cartCount.textContent = items.reduce((sum, i) => sum + i.quantity, 0);

  attachEvents();
}

// ========================
// EVENTS
// ========================
function attachEvents() {
  document.querySelectorAll(".plus").forEach((btn) => {
    btn.onclick = () => updateQty(btn.dataset.id, "plus");
  });

  document.querySelectorAll(".minus").forEach((btn) => {
    btn.onclick = () => updateQty(btn.dataset.id, "minus");
  });

  document.querySelectorAll(".remove").forEach((btn) => {
    btn.onclick = () => removeItem(btn.dataset.id);
  });
}

// ========================
// UPDATE
// ========================
async function updateQty(id, action) {
  await fetch("/cart/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId: id, action }),
  });

  loadCart();
}

// ========================
// REMOVE
// ========================
async function removeItem(id) {
  await fetch("/cart/remove", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId: id }),
  });

  loadCart();
}

// ========================
// CLOSE
// ========================
document.addEventListener("DOMContentLoaded", () => {
  document.querySelector(".close-cart")?.addEventListener("click", () => {
    cart.classList.remove("active");
    overlay.classList.remove("active");
  });

  overlay?.addEventListener("click", () => {
    cart.classList.remove("active");
    overlay.classList.remove("active");
  });
});

// INIT
loadCart();

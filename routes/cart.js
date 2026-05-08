const express = require("express");
const router = express.Router();
const Cart = require("../models/cart");
const Product = require("../models/Products");

// ========================
// HELPER GET OR CREATE CART
// ========================
async function getCart(req) {
  let cart = await Cart.findOne({
    $or: [{ user: req.user?._id }, { sessionId: req.session.cartId }],
  });

  if (!cart) {
    cart = new Cart({
      user: req.user?._id || null,
      sessionId: req.session.cartId || null,
      expiresAt: req.user
        ? null
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    await cart.save();

    if (!req.user) {
      req.session.cartId = cart._id;
    }
  }

  return cart;
}

// ========================
// GET CART
// ========================
router.get("/", async (req, res) => {
  try {
    const cart = await getCart(req);
    const populated = await cart.populate("items.product");

    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: "Error loading cart" });
  }
});

// ========================
// ADD TO CART
// ========================
router.post("/add", async (req, res) => {
  try {
    const { productId } = req.body;

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.stock <= 0) {
      return res.status(400).json({ message: "OUT_OF_STOCK" });
    }

    const finalPrice =
      product.discountPrice && product.discountPrice > 0
        ? product.discountPrice
        : product.price;

    const cart = await getCart(req);

    const index = cart.items.findIndex(
      (i) => i.product.toString() === productId,
    );

    //Limit 500
    const MAX_LIMIT = 500;

    if (index > -1) {
      const currentQty = cart.items[index].quantity;

      if (currentQty >= MAX_LIMIT) {
        return res.status(400).json({ message: "LIMIT_REACHED" });
      }

      if (currentQty + 1 > product.stock) {
        return res.status(400).json({ message: "NOT_ENOUGH_STOCK" });
      }

      cart.items[index].quantity++;
    } else {
      cart.items.push({
        product: productId,
        quantity: 1,
        priceAtTime: finalPrice,
      });
    }

    await cart.save();

    const populated = await cart.populate("items.product");
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: "Error adding to cart" });
  }
});
// ========================
// UPDATE QUANTITY
// ========================
router.post("/update", async (req, res) => {
  try {
    const { productId, action } = req.body;

    const cart = await getCart(req);
    const item = cart.items.find((i) => i.product.toString() === productId);

    if (!item) return res.json(cart);

    const product = await Product.findById(productId);

    const MAX_LIMIT = 500;

    if (action === "plus") {
      if (item.quantity >= MAX_LIMIT) {
        return res.status(400).json({ message: "LIMIT_REACHED" });
      }

      if (item.quantity + 1 > product.stock) {
        return res.status(400).json({ message: "NOT_ENOUGH_STOCK" });
      }

      item.quantity++;
    }

    if (action === "minus" && item.quantity > 1) {
      item.quantity--;
    }

    await cart.save();

    const populated = await cart.populate("items.product");
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: "Error updating cart" });
  }
});
// ========================
// REMOVE ITEM
// ========================
router.post("/remove", async (req, res) => {
  try {
    const { productId } = req.body;

    const cart = await getCart(req);

    cart.items = cart.items.filter((i) => i.product.toString() !== productId);

    await cart.save();

    const populated = await cart.populate("items.product");
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: "Error removing item" });
  }
});

module.exports = router;

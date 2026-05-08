const express = require("express");
const router = express.Router();

const Product = require("../models/Products");
const isAdmin = require("../middleware/isAdmin");
const upload = require("../middleware/upload");
const Wholesale = require("../models/Wholesale");
const WholesaleProduct = require("../models/WholesaleProduct");
const nodemailer = require("nodemailer");

router.get("/dashboard", isAdmin, (req, res) => {
  res.render("admin/dashboard", {
    layout: "layouts/admin-layout",
  });
});

//  Add Product Page
router.get("/products/add", isAdmin, (req, res) => {
  res.render("admin/add-product", {
    layout: "layouts/admin-layout",
  });
});

// Get All products
router.get("/products", isAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 8;

    // ===== FILTERS =====
    let filter = {};

    // BRAND FILTER (SUPER FIXED)
    if (req.query.brand && req.query.brand !== "") {
      const cleanBrand = req.query.brand.toLowerCase().replace(/\s+/g, "");

      filter.$expr = {
        $regexMatch: {
          input: {
            $replaceAll: {
              input: { $toLower: "$brand" },
              find: " ",
              replacement: "",
            },
          },
          regex: cleanBrand,
        },
      };
    }

    if (req.query.strength && req.query.strength !== "") {
      filter.strength = req.query.strength;
    }

    if (req.query.stock === "in") {
      filter.stock = { $gt: 0 };
    }

    if (req.query.stock === "out") {
      filter.stock = 0;
    }

    let sort = { createdAt: -1 };

    if (req.query.sort === "price-low") sort = { price: 1 };
    if (req.query.sort === "price-high") sort = { price: -1 };
    if (req.query.sort === "name") sort = { name: 1 };

    // ===== QUERY =====
    const products = await Product.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Product.countDocuments(filter);

    // ===== STATS =====
    const totalProducts = await Product.countDocuments();
    const inStock = await Product.countDocuments({ stock: { $gt: 0 } });
    const outStock = await Product.countDocuments({ stock: 0 });

    if (req.xhr || req.headers.accept?.includes("application/json")) {
      return res.json({
        products,
        hasMore: page * limit < total,
      });
    }

    res.render("admin/products", {
      layout: "layouts/admin-layout",
      products,
      hasMore: page * limit < total,
      nextPage: page + 1,

      totalProducts,
      inStock,
      outStock,

      query: req.query,
    });
  } catch (err) {
    console.log(err);
    res.send("Error loading products");
  }
});

//  Create Product

router.post(
  "/products/add",
  isAdmin,
  upload.array("images", 5),
  async (req, res) => {
    try {
      const {
        name,
        price,
        discountPrice,
        description,
        strength,
        nicotine,
        brand,
        flavour,
        category,
        stock,
      } = req.body;

      const parsedPrice = parseFloat(price);
      const parsedDiscount = discountPrice ? parseFloat(discountPrice) : 0;

      const slug = name
        .toLowerCase()
        .replace(/ /g, "-")
        .replace(/[^\w-]+/g, "");

      const images = req.files.map((file) => "/uploads/" + file.filename);

      await Product.create({
        name,
        slug,
        price: parsedPrice,
        discountPrice: parsedDiscount,
        description,
        strength,
        nicotine,
        brand,
        flavour,
        category,
        stock,
        images,
      });

      req.flash("success", "Product added successfully!");
      res.redirect("/admin/products");
    } catch (err) {
      console.log(err);
      req.flash("error", "Error creating product");
      res.redirect("/admin/products/add");
    }
  },
);

// Delete Product
router.post("/products/delete/:id", isAdmin, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);

    req.flash("success", "Product deleted!");
    res.redirect("/admin/products");
  } catch (err) {
    req.flash("error", "Delete failed");
    res.redirect("/admin/products");
  }
});

/* Edit Product */
router.get("/products/edit/:id", isAdmin, async (req, res) => {
  const product = await Product.findById(req.params.id);

  res.render("admin/edit-product", {
    layout: "layouts/admin-layout",
    product,
  });
});

router.post(
  "/products/edit/:id",
  isAdmin,
  upload.array("images", 5),
  async (req, res) => {
    try {
      const {
        name,
        price,
        discountPrice,
        description,
        strength,
        nicotine,
        category,
        stock,
      } = req.body;

      const product = await Product.findById(req.params.id);

      const updatedData = {
        name,
        price: parseFloat(price),
        discountPrice: discountPrice ? parseFloat(discountPrice) : 0,
        description,
        strength,
        nicotine,
        category,
        stock,
      };

      let images = product.images || [];

      if (req.body.removeImages) {
        const removeList = Array.isArray(req.body.removeImages)
          ? req.body.removeImages
          : [req.body.removeImages];

        images = images.filter((img) => !removeList.includes(img));
      }

      if (req.files && req.files.length > 0) {
        const newImages = req.files.map((file) => "/uploads/" + file.filename);

        images = [...images, ...newImages];
      }

      updatedData.images = images;

      await Product.findByIdAndUpdate(req.params.id, updatedData);

      req.flash("success", "Product updated!");
      res.redirect("/admin/products");
    } catch (err) {
      console.log(err);
      req.flash("error", "Update failed");
      res.redirect("/admin/products");
    }
  },
);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.USER_EMAIL,
    pass: process.env.USER_PASSWORD,
  },
});

// GET ALL REQUESTS
router.get("/wholesale", isAdmin, async (req, res) => {
  const requests = await Wholesale.find().sort({ createdAt: -1 });

  res.render("admin/wholesale", {
    layout: "layouts/admin-layout",
    requests,
  });
});

router.post("/wholesale/approve/:id", isAdmin, async (req, res) => {
  const request = await Wholesale.findById(req.params.id);

  request.status = "approved";
  await request.save();

  const user = await User.findOne({ email: request.email });

  if (user) {
    user.isWholesaleApproved = true;
    user.wholesaleInfo = request._id;
    await user.save();
  }

  //SEND EMAIL
  await transporter.sendMail({
    to: request.email,
    subject: "Wholesale Approved 🎉",
    html: `
      <h2>Congratulations!</h2>
      <p>You are now approved for wholesale access.</p>
      <p>You can now view wholesale products on our website.</p>
    `,
  });

  res.redirect("/admin/wholesale");
});

router.post("/wholesale/reject/:id", isAdmin, async (req, res) => {
  const request = await Wholesale.findById(req.params.id);

  request.status = "rejected";
  await request.save();

  res.redirect("/admin/wholesale");
});

router.get("/wholesale-products", isAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 8;

    let filter = {};

    // BRAND
    if (req.query.brand && req.query.brand !== "") {
      filter.brand = { $regex: req.query.brand, $options: "i" };
    }

    // STRENGTH
    if (req.query.strength) {
      filter.strength = req.query.strength;
    }

    // STOCK
    if (req.query.stock === "in") {
      filter.stock = { $gt: 0 };
    }

    if (req.query.stock === "out") {
      filter.stock = 0;
    }

    // SORT
    let sort = { createdAt: -1 };

    if (req.query.sort === "price-low") sort = { price: 1 };
    if (req.query.sort === "price-high") sort = { price: -1 };
    if (req.query.sort === "name") sort = { name: 1 };

    const products = await WholesaleProduct.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await WholesaleProduct.countDocuments(filter);

    // AJAX
    if (req.xhr || req.headers.accept?.includes("application/json")) {
      return res.json({
        products,
        hasMore: page * limit < total,
      });
    }

    res.render("admin/wholesale-products", {
      layout: "layouts/admin-layout",
      products,
      hasMore: page * limit < total,
      query: req.query,
    });
  } catch (err) {
    console.log(err);
  }
});

router.get("/wholesale-products/add", isAdmin, (req, res) => {
  res.render("admin/add-wholesale-product", {
    layout: "layouts/admin-layout",
  });
});

router.post(
  "/wholesale-products/add",
  isAdmin,
  upload.array("images", 5),
  async (req, res) => {
    try {
      const { name, price, description, stock, brand, strength } = req.body;

      const images = req.files.map((file) => "/uploads/" + file.filename);

      await WholesaleProduct.create({
        name,
        price,
        description,
        stock,
        brand,
        strength,
        images,
      });

      res.redirect("/admin/wholesale-products");
    } catch (err) {
      console.log(err);
      res.redirect("/admin/wholesale-products");
    }
  },
);

router.post("/wholesale-products/delete/:id", isAdmin, async (req, res) => {
  await WholesaleProduct.findByIdAndDelete(req.params.id);
  res.redirect("/admin/wholesale-products");
});

router.get("/wholesale-products/edit/:id", isAdmin, async (req, res) => {
  const product = await WholesaleProduct.findById(req.params.id);

  res.render("admin/edit-wholesale-product", {
    layout: "layouts/admin-layout",
    product,
  });
});

router.post(
  "/wholesale-products/edit/:id",
  isAdmin,
  upload.array("images", 5),
  async (req, res) => {
    try {
      const { name, price, description, stock, brand, strength } = req.body;

      const product = await WholesaleProduct.findById(req.params.id);

      let images = product.images || [];

      if (req.body.removeImages) {
        const removeList = Array.isArray(req.body.removeImages)
          ? req.body.removeImages
          : [req.body.removeImages];

        images = images.filter((img) => !removeList.includes(img));
      }

      if (req.files && req.files.length > 0) {
        const newImages = req.files.map((f) => "/uploads/" + f.filename);
        images = [...images, ...newImages];
      }

      await WholesaleProduct.findByIdAndUpdate(req.params.id, {
        name,
        price,
        description,
        stock,
        brand,
        strength,
        images,
      });

      res.redirect("/admin/wholesale-products");
    } catch (err) {
      console.log(err);
      res.redirect("/admin/wholesale-products");
    }
  },
);

module.exports = router;

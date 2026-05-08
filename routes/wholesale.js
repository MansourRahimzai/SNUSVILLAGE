const express = require("express");
const router = express.Router();

const Wholesale = require("../models/Wholesale");

// SHOW PAGE
router.get("/", (req, res) => {
  res.render("wholesale/wholesale", {
    query: req.query,
  });
});

// SUBMIT FORM
router.post("/wholesale", async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      companyName,
      tradingNumber,
      address,
      vatNumber,
    } = req.body;

    // =========================
    // 1. EMAIL UNIQUE
    // =========================
    const existing = await Wholesale.findOne({
      email: email.toLowerCase().trim(),
    });

    if (existing) {
      req.flash("error", "This email already exists!");
      return res.redirect("/wholesale");
    }

    // =========================
    // 2. COMPANY NUMBER (8 DIGITS)
    // =========================
    const companyRegex = /^\d{8}$/;

    if (!companyRegex.test(tradingNumber)) {
      req.flash("error", "Company number must be exactly 8 digits!");
      return res.redirect("/wholesale");
    }

    // =========================
    // 3. VAT VALIDATION
    // 2 LETTER + 9 NUMBER
    // =========================
    const vatRegex = /^[A-Za-z]{2}\d{9}$/;

    if (!vatRegex.test(vatNumber)) {
      req.flash(
        "error",
        "VAT must be 2 letters + 9 numbers (Example: AB123456789)",
      );
      return res.redirect("/wholesale");
    }

    // =========================
    // SAVE DATA
    // =========================
    await Wholesale.create({
      firstName,
      lastName,
      email: email.toLowerCase().trim(),
      phone,
      companyName,
      tradingNumber,
      address,
      vatNumber: vatNumber.toUpperCase(),
    });

    req.flash("success", "Application sent successfully!");
    res.redirect("/wholesale");
  } catch (err) {
    console.log(err);
    req.flash("error", "Something went wrong!");
    res.redirect("/wholesale");
  }
});

module.exports = router;

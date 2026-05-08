const express = require("express");
const router = express.Router();
const WaitingList = require("../models/waitingList");

router.post("/notify", async (req, res) => {
  const { email, productId } = req.body;

  const exists = await WaitingList.findOne({ email, product: productId });

  if (!exists) {
    await WaitingList.create({ email, product: productId });
  }

  res.json({ success: true });
});

module.exports = router;

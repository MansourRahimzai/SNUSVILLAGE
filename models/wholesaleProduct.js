const mongoose = require("mongoose");

const wholesaleProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },

    description: String,

    images: [String],

    stock: { type: Number, default: 0 },

    brand: String,

    strength: String,
  },
  { timestamps: true },
);

module.exports = mongoose.model("WholesaleProduct", wholesaleProductSchema);

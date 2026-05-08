const mongoose = require("mongoose");

const wholesaleSchema = new mongoose.Schema(
  {
    firstName: String,
    lastName: String,

    email: {
      type: String,
      unique: true,
      required: true,
      lowercase: true,
      trim: true,
    },

    phone: String,

    companyName: String,

    tradingNumber: String,

    address: String,

    vatNumber: String,

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true },
);

module.exports =
  mongoose.models.Wholesale || mongoose.model("Wholesale", wholesaleSchema);

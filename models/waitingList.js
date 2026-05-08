const mongoose = require("mongoose");

const waitingListSchema = new mongoose.Schema({
  email: String,
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
  },
  notified: { type: Boolean, default: false },
});

module.exports = mongoose.model("WaitingList", waitingListSchema);

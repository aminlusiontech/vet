const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model("Counter", counterSchema);

/**
 * Get next sequential order number (1001, 1002, 1003, ...).
 * Thread-safe via atomic findOneAndUpdate.
 */
async function getNextOrderNumber() {
  const doc = await Counter.findOneAndUpdate(
    { name: "orderNumber" },
    { $setOnInsert: { name: "orderNumber", seq: 1000 }, $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return doc.seq;
}

module.exports = Counter;
module.exports.getNextOrderNumber = getNextOrderNumber;

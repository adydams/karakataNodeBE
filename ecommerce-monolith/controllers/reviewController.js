// controllers/reviewController.js
const reviewService = require("../services/reviewServices");

exports.upsert = async (req, res) => {
  const { productId, rating, comment } = req.body;
  const rev = await reviewService.upsert(req.user.id, productId, { rating, comment });
  res.status(201).json({ success: true, data: rev });
};

exports.remove = async (req, res) => {
  const ok = await reviewService.remove(req.user.id, req.params.productId);
  if (!ok) return res.status(404).json({ success: false, message: "Review not found" });
  res.json({ success: true, message: "Review deleted" });
};

exports.listForProduct = async (req, res) => {
  const list = await reviewService.listForProduct(req.params.productId);
  res.json({ success: true, data: list });
};

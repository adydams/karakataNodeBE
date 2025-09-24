// controllers/favoriteController.js
const favoriteService = require("../services/favoriteServices");

exports.add = async (req, res) => {
  const fav = await favoriteService.add(req.user.id, req.body.productId);
  res.status(201).json({ success: true, data: fav });
};

exports.remove = async (req, res) => {
  const ok = await favoriteService.remove(req.user.id, req.params.productId);
  if (!ok) return res.status(404).json({ success: false, message: "Favorite not found" });
  res.json({ success: true, message: "Removed from favorites" });
};

exports.list = async (req, res) => {
  const items = await favoriteService.list(req.user.id);
  res.json({ success: true, data: items });
};

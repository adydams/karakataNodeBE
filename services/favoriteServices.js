// services/favoriteService.js
const {  Favorite, Product, ProductImage } = require("../models");

class FavoriteServices {
  async add(userId, productId) {
    return Favorite.findOrCreate({ where: { userId, productId } }).then(([fav]) => fav);
  }

  async remove(userId, productId) {
    const fav = await Favorite.findOne({ where: { userId, productId } });
    if (!fav) return null;
    await fav.destroy();
    return true;
  }

  list(userId) {
    return Favorite.findAll({
      where: { userId },
      include: [{ model: Product, as: "product", include: [{ model: ProductImage, as: "images" }] }]
    });
  }
}

module.exports = new FavoriteServices();

// services/reviewService.js
const { Review, Product, User } = require("../models");

class ReviewServices {
  async upsert(userId, productId, { rating, comment }) {
    const [rev] = await Review.findOrCreate({ where: { userId, productId }, defaults: { rating, comment } });
    if (!rev.isNewRecord) await rev.update({ rating, comment });
    return rev;
  }

  async remove(userId, productId) {
    const rev = await Review.findOne({ where: { userId, productId } });
    if (!rev) return null;
    await rev.destroy();
    return true;
  }

  listForProduct(productId) {
    return Review.findAll({
      where: { productId },
      include: [{ model: User, as: "user", attributes: ["id", "name"] }, { model: Product, as: "product", attributes: ["id", "name"] }]
    });
  }
}

module.exports = new ReviewServices();

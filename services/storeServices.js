const { Store, Product } = require("../models");

class StoreServices {
 async createStore(data, currentUser) {

    const ownerUserId = data.storeOwnerId || currentUser.id;

    // If creating for another user, only SuperAdmin can do it
    if (
        ownerUserId !== currentUser.id &&
        currentUser.role !== "SuperAdmin"
    ) {
        throw new Error(
            "You are not authorized to create a store for another user"
        );
    }

    const existingStore = await Store.findOne({
        where: {
            ownerUserId,
            isDeleted: false
        }
    });

    if (existingStore) {
        throw new Error(
            "This user already has a store"
        );
    }

    return await Store.create({
        ...data,
        ownerUserId,
        createdBy: currentUser.id
    });
}

  async getAllStores() {
    return await Store.findAll({ where: { isDeleted: false } });
  }

  async getStoreById(id) {
    return await Store.findOne({ where: { id, isDeleted: false } });
  }

  async updateStore(id, data) {
    const store = await Store.findOne({ where: { id, isDeleted: false } });
    if (!store) return null;
    return await store.update(data);
  }

  async deleteStore(id) {
    const t = await require("../db/database").sequelize.transaction();
    try {
      const store = await Store.findByPk(id, { transaction: t });
      if (!store) {
        await t.rollback();
        return null;
      }

      // Soft-delete all products belonging to this store
      await Product.update({ isDeleted: true }, { where: { storeId: id }, transaction: t });

      // Soft-delete all inventory records for those products
      const products = await Product.findAll({ where: { storeId: id }, attributes: ['id'], transaction: t });
      const productIds = products.map(p => p.id);
      if (productIds.length > 0) {
        await require("../models").Inventory.update({ isDeleted: true }, { where: { productId: { [require("sequelize").Op.in]: productIds } }, transaction: t });
      }

      await store.update({ isDeleted: true }, { transaction: t });
      await t.commit();
      return store;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
}

module.exports = new StoreServices();

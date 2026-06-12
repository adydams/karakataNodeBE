const Store = require("../models/storeModel");

class StoreServices {
  async createStore(data, userId) {
    console.log("Creating store with data:", { data, userId });
   const existingStore = await Store.findOne({
        where: {
            ownerUserId: userId,
            isDeleted: false
        }
    });
console.log("Existing store check:", { userId, existingStore: existingStore ? existingStore.toJSON() : null });
    if (existingStore) {
        throw new Error(
            "You already have a store"
        );
    }

    return await Store.create({
        ...data,
        ownerUserId: userId
    });
  }

  async getAllStores() {
    return await Store.findAll();
  }

  async getStoreById(id) {
    return await Store.findByPk(id);
  }

  async updateStore(id, data) {
    const store = await Store.findByPk(id);
    if (!store) return null;
    return await store.update(data);
  }

  async deleteStore(id) {
    const store = await Store.findByPk(id);
    if (!store) return null;
    await store.destroy();
    return store;
  }
}

module.exports = new StoreServices();

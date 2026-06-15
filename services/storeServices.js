const Store = require("../models/storeModel");

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

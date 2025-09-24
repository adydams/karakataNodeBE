const { Store } = require("../models/storeModel");

class StoreServices {
  async createStore(data) {
    return await Store.create(data);
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

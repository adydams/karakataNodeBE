const { Store, StorePickupStation, ProductPickupStation, Inventory, Product } = require("../models");
const ShipBubbleAdapter = require("../services/ShipBubbles/shipbubbleAdapter");
const InventoryService = require("./inventoryServices");
const sequelize = require("../db/database");

class PickupStationServices {
  async createPickupStation(data) {
    const store = await Store.findByPk(data.storeId);

    if (!store) {
      throw new Error("Store not found");
    }

    const exists = await StorePickupStation.findOne({
      where: {
        storeId: data.storeId,
        name: data.name,
        isDeleted: false,
      },
    });

    if (exists) {
      throw new Error("Pickup station name already exists");
    }

    try {
      const result = await ShipBubbleAdapter.validateAddress({
        name: data.contactPerson || store.name,
        email: store.email,
        phone: data.phone,
        address: data.address,
      });
      if (!result?.address_code) {
        throw new Error("This address is invalid. Please check the address details.");
      }
      data.shipbubbleAddressCode = result.address_code;
    } catch (error) {
      throw new Error(error.message || "Unable to validate pickup station address");
    }

    const existingStations = await StorePickupStation.count({
      where: {
        storeId: data.storeId,
        isDeleted: false,
      },
    });

    if (existingStations === 0) {
      data.isDefault = true;
    }

    if (data.isDefault === true) {
      await StorePickupStation.update(
        { isDefault: false },
        {
          where: { storeId: data.storeId },
        }
      );
    }

    return await StorePickupStation.create(data);
  }

  async getAllPickupStations() {
    return await StorePickupStation.findAll({
      include: [
        {
          model: Store,
          as: "store",
        },
      ],
    });
  }

  async getPickupStationsByStore(storeId) {
    return await StorePickupStation.findAll({
      where: { storeId },
      include: [
        {
          model: Store,
          as: "store",
        },
      ],
      order: [["isDefault", "DESC"]],
    });
  }

  async getPickupStationById(id) {
    return await StorePickupStation.findByPk(id, {
      include: [
        {
          model: Store,
          as: "store",
        },
      ],
    });
  }

  async updatePickupStation(id, data) {
    const station = await StorePickupStation.findByPk(id);

    if (!station) {
      return null;
    }

    if (data.isDefault === true) {
      await StorePickupStation.update(
        { isDefault: false },
        {
          where: {
            storeId: station.storeId,
          },
        }
      );
    }

    if (data.address && data.address !== station.address) {
      const store = await Store.findByPk(station.storeId);
      try {
        const result = await ShipBubbleAdapter.validateAddress({
          name: data.contactPerson || station.contactPerson || store.name,
          email: store.email,
          phone: data.phone || station.phone,
          address: data.address,
        });
        data.shipbubbleAddressCode = result.address_code;
      } catch (error) {
        throw new Error(error.message || "Unable to validate pickup station address");
      }
    }

    return await station.update(data);
  }

  async deletePickupStation(id) {
    const station = await StorePickupStation.findByPk(id, {
      where: { id, isDeleted: false }
    });

    if (!station) {
      return null;
    }
    await station.update({ isDeleted: true });
    return station;
  }

  async assignProductToStation(productId, stationId, initialStock = 0) {
    const t = await sequelize.transaction();
    try {
      const [productStation] = await ProductPickupStation.findOrCreate({
        where: { productId, pickupStationId: stationId },
        defaults: { productId, pickupStationId: stationId },
        transaction: t
      });

      const [inventory] = await Inventory.findOrCreate({
        where: {
          productId,
          pickupStationId: stationId,
        },
        defaults: {
          productId,
          pickupStationId: stationId,
          quantityOnHand: initialStock,
          quantityReserved: 0,
          lowStockThreshold: 10,
        },
        transaction: t,
      });
 
      if (inventory.quantityOnHand !== initialStock) {
        await inventory.update({ quantityOnHand: initialStock }, { transaction: t });
      }
 
      await InventoryService.syncProductStockCache(productId, t);

      await t.commit();
      return { productStation, inventory };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  async updateStationStock(payload, newQuantity) {
    let inventory;
    if (payload.inventoryId) {
      inventory = await Inventory.findByPk(payload.inventoryId);
    } else if (payload.productPickupStationId) {
      const productPickupStation = await ProductPickupStation.findByPk(payload.productPickupStationId);
      if (!productPickupStation) {
        throw new Error("Product pickup station record not found");
      }
      inventory = await Inventory.findOne({
        where: {
          productId: productPickupStation.productId,
          pickupStationId: productPickupStation.pickupStationId,
        },
      });
    } else if (payload.productId && payload.pickupStationId) {
      inventory = await Inventory.findOne({
        where: {
          productId: payload.productId,
          pickupStationId: payload.pickupStationId,
        },
      });
    }

    if (!inventory) {
      throw new Error("Inventory record not found");
    }

    if (newQuantity < inventory.quantityReserved) {
      throw new Error("New quantity cannot be less than reserved stock");
    }

    await inventory.update({ quantityOnHand: newQuantity });
    await InventoryService.syncProductStockCache(inventory.productId);
    return inventory;
  }
}

module.exports = new PickupStationServices();

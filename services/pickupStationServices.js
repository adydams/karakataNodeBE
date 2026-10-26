const { Store, StorePickupStation, ProductPickupStation, Inventory, Product, User } = require("../models");
const ShipBubbleAdapter = require("../services/ShipBubbles/shipbubbleAdapterSafe");
const InventoryService = require("./inventoryServices");
const sequelize = require("../db/database");

function normalizeCoord(value) {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

class PickupStationServices {
  async createPickupStation(data) {
    // Resolve the owning store. Admin-created platform stations may omit
    // storeId — fall back to the store that owns the product being assigned,
    // or the first existing store as a last resort.
    let store = null;
    if (data.storeId) {
      store = await Store.findByPk(data.storeId);
    } else if (data.productId) {
      store = await Store.findOne({
        include: [{ model: Product, as: "products", where: { id: data.productId }, required: true }],
      });
    }
    if (!store) {
      store = await Store.findOne({ where: { isDeleted: false }, order: [["createdAt", "ASC"]] });
    }

    if (!store) {
      throw new Error("Store not found. Create a store before adding pickup stations.");
    }
    data.storeId = store.id;

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

    const clientLat = normalizeCoord(data.latitude);
    const clientLng = normalizeCoord(data.longitude);

    try {
      let email = data.email;
      if (!email) {
        email = store.email;
        if (!email && store.ownerUserId) {
          const owner = await User.findByPk(store.ownerUserId);
          email = owner?.email;
        }
      }

      if (!email) {
        throw new Error("A valid email address is required for address validation. Please add an email to the pickup station, the store, or the store owner's profile.");
      }

      const result = await ShipBubbleAdapter.validateAddress({
        name: data.contactPerson || store.name,
        email: email,
        phone: data.phone,
        address: data.address,
        // ShipBubble uses coordinates for precise geocoding/valuation when provided.
        latitude: clientLat ?? undefined,
        longitude: clientLng ?? undefined,
      });
      if (!result?.address_code) {
        throw new Error("This address is invalid. Please check the address details.");
      }
      data.shipbubbleAddressCode = result.address_code;
      // Map-picked coordinates win; fall back to ShipBubble's response when present.
      data.latitude = clientLat ?? result.latitude ?? null;
      data.longitude = clientLng ?? result.longitude ?? null;
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
      if (!store) throw new Error("Associated store not found");

      let email = data.email || station.email;
      if (!email) {
        email = store.email;
        if (!email && store.ownerUserId) {
          const owner = await User.findByPk(store.ownerUserId);
          email = owner?.email;
        }
      }

      if (!email) {
        throw new Error("A valid email address is required for address validation. Please add an email to the pickup station, the store, or the store owner's profile.");
      }

      try {
        const result = await ShipBubbleAdapter.validateAddress({
          name: data.contactPerson || station.contactPerson || store.name,
          email: email,
          phone: data.phone || station.phone,
          address: data.address,
          // ShipBubble uses coordinates for precise geocoding/valuation when provided.
          latitude: normalizeCoord(data.latitude) ?? station.latitude ?? undefined,
          longitude: normalizeCoord(data.longitude) ?? station.longitude ?? undefined,
        });
        data.shipbubbleAddressCode = result.address_code;
        // Map-picked coordinates win; fall back to ShipBubble's response, then existing values.
        data.latitude = normalizeCoord(data.latitude) ?? result.latitude ?? station.latitude;
        data.longitude = normalizeCoord(data.longitude) ?? result.longitude ?? station.longitude;
      } catch (error) {
        throw new Error(error.message || "Unable to validate pickup station address");
      }
    } else {
      // Address unchanged: still allow coordinate updates from the map picker.
      if (data.latitude !== undefined) data.latitude = normalizeCoord(data.latitude) ?? station.latitude;
      if (data.longitude !== undefined) data.longitude = normalizeCoord(data.longitude) ?? station.longitude;
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

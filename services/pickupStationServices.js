const { Store, StorePickupStation } = require("../models");
const ShipBubbleAdapter = require("../services/ShipBubbles/shipbubbleAdapter");

class PickupStationServices {
  async createPickupStation(data) {
  const store = await Store.findByPk(data.storeId);

  if (!store) {
    throw new Error("Store not found");
  }

  const exists =
    await StorePickupStation.findOne({
        where: {
            storeId: data.storeId,
            name: data.name,
            isDeleted: false,
        },
    });

if (exists) {
    throw new Error(
        "Pickup station name already exists"
    );
}

  try {
    const result =
      await ShipBubbleAdapter.validateAddress({
        name: data.contactPerson || store.name,
        email: store.email,
        phone: data.phone,
        address: data.address,
      });
      if (!result?.address_code) {
    throw new Error(
        "This address is invalid. Please check the address details."
    );
}

    data.shipbubbleAddressCode =   result.address_code;
  } catch (error) {
    throw new Error(
      error.message ||
      "Unable to validate pickup station address"
    );
  }

  const existingStations =
    await StorePickupStation.count({
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
        where: {
          storeId: data.storeId,
        },
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

    // Address changed → revalidate
    if (
        data.address &&
        data.address !== station.address
    ) {
        const store = await Store.findByPk(station.storeId);

        try{
                const result = await ShipBubbleAdapter.validateAddress({
                name: data.contactPerson || station.contactPerson || store.name,
                email: store.email,
                phone: data.phone || station.phone,
                address: data.address,
                });
                } catch (error) {
            throw new Error(
                error.message ||
                "Unable to validate pickup station address"
            );
        }

        data.shipbubbleAddressCode = result.address_code;
    }

    return await station.update(data);
    }

  async deletePickupStation(id) {
    const station = await StorePickupStation.findByPk(id, {
      where: {
        id,
        isDeleted: false
      }
    });

    if (!station) {
      return null;
    }
    if (data.isDefault === true) {
    await StorePickupStation.update(
        { isDefault: false },
        {
            where: {
                storeId: data.storeId,
            },
        }
    );  
}
    await station.update({
        isDeleted: true,
        });
    return station;
  }
}

module.exports = new PickupStationServices();
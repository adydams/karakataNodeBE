// services/productServices.js
const { sequelize, Product, ProductImage, Inventory, ProductPickupStation, StorePickupStation, ProductDiscount, Store, SystemSetting, User, Role } = require("../models");
const QRCode = require("qrcode");
const cloudinary = require("../config/cloudinary");
const InventoryService = require("./inventoryServices");
const auditService = require("./auditService");
const { calculateCurrentPrice } = require("../utils/priceHelper");

function parsePickupStations(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

class ProductService {

  async createProduct(data, files) {
    const t = await sequelize.transaction();
    try {
      if (!data.storeId) throw new Error("Store is required when creating a product");
      const store = await Store.findByPk(data.storeId, { transaction: t });
      if (!store || store.isDeleted) throw new Error("Selected store was not found or is inactive");

      const setting = await SystemSetting.findOne({ transaction: t });
      const requiresApproval = setting?.productApprovalRequired === true;
      const approvalHours = Number(setting?.productApprovalSlaHours || 48);
      const product = await Product.create({
        name: data.name,
        description: data.description || null,
        price: data.price,
        stockQuantity: data.stockQuantity ?? 0,
        categoryId: data.categoryId,
        subCategoryId: data.subCategoryId,
        storeId: data.storeId,
        brandId: data.brandId || null,
        weightKg: data.weightKg ?? 0,
        lengthCm: data.lengthCm || null,
        widthCm: data.widthCm || null,
        heightCm: data.heightCm || null,
        logisticsCategoryId: data.logisticsCategoryId || null,
        fulfillmentMethod: data.fulfillmentMethod === "HUB_DROPOFF" ? "HUB_DROPOFF" : "RIDER_PICKUP",
        fulfillmentHubId: data.fulfillmentMethod === "HUB_DROPOFF" ? (data.fulfillmentHubId || null) : null,
        status: requiresApproval ? "pending_review" : "approved",
        approvalDeadline: requiresApproval && setting?.productApprovalSlaEnabled !== false
          ? new Date(Date.now() + approvalHours * 60 * 60 * 1000)
          : null,
      }, {
        transaction: t
      });
      if (requiresApproval && store.ownerUserId) {
        await require("./notificationService").notify(store.ownerUserId, {
          type: "PRODUCT_PENDING_REVIEW",
          title: "Product awaiting approval",
          message: `${product.name} is awaiting administrator approval.`,
          metadata: { productId: product.id },
          sendEmail: true,
        }, t);
        const admins = await User.findAll({
          include: [{ model: Role, as: "role", where: { name: { [require("sequelize").Op.in]: ["Admin", "SuperAdmin", "SystemAdmin"] } } }],
          attributes: ["id"],
          transaction: t,
        });
        await Promise.all(admins.map((admin) => require("./notificationService").notify(admin.id, {
          type: "PRODUCT_APPROVAL_REQUIRED",
          title: "New product awaiting approval",
          message: `${product.name} requires approval before it can go live.`,
          metadata: { productId: product.id, storeId: store.id },
        }, t)));
      }

      let discounts = data.discounts;
      if (typeof discounts === 'string') {
        try {
          discounts = JSON.parse(discounts);
        } catch (e) {
          discounts = [];
        }
      }

      if (discounts && Array.isArray(discounts) && discounts.length > 0) {
        const discountRecords = discounts
          .filter(d => d.value !== "" && d.value !== undefined && d.value !== null)
          .map(d => ({
            productId: product.id,
            discountType: d.discountType || 'PERCENTAGE',
            value: d.value,
            minQuantity: d.minQuantity === "" ? 1 : (d.minQuantity || 1),
            maxQuantity: d.maxQuantity === "" ? null : (d.maxQuantity || null),
            startDate: d.startDate || null,
            endDate: d.endDate || null,
            isActive: d.isActive ?? true
          }));
        if (discountRecords.length > 0) {
          await ProductDiscount.bulkCreate(discountRecords, { transaction: t });
        }
      }

      const pickupStationsPayload = parsePickupStations(data.pickupStations);

      if (pickupStationsPayload?.length > 0) {
        for (const station of pickupStationsPayload) {
          const stationId = station.stationId || station.pickupStationId;
          if (!stationId) continue;
          const initialStock = station.initialStock ?? station.quantityOnHand ?? 0;

          await ProductPickupStation.findOrCreate({
            where: {
              productId: product.id,
              pickupStationId: stationId,
            },
            defaults: {
              productId: product.id,
              pickupStationId: stationId,
            },
            transaction: t,
          });

          const [inventory] = await Inventory.findOrCreate({
            where: {
              productId: product.id,
              pickupStationId: stationId,
            },
            defaults: {
              productId: product.id,
              pickupStationId: stationId,
              quantityOnHand: initialStock,
              quantityReserved: 0,
              lowStockThreshold: station.lowStockThreshold ?? 5,
            },
            transaction: t,
          });

          if (inventory.quantityOnHand !== initialStock) {
            await inventory.update({ quantityOnHand: initialStock }, { transaction: t });
          }
        }
        await InventoryService.syncProductStockCache(product.id, t);
      } else if (data.pickupStationId) {
        await Inventory.create({
          productId: product.id,
          pickupStationId: data.pickupStationId,
          quantityOnHand: data.stockQuantity ?? 0,
          quantityReserved: 0,
          lowStockThreshold: data.lowStockThreshold ?? 5,
        }, {
          transaction: t,
        });
      }

      let productImages = [];
      if(files && files.length){
        for(const file of files){
          const upload = await cloudinary.uploader.upload(
            file.path,
            { folder:"products" }
          );
          productImages.push({
            productId: product.id,
            url: upload.secure_url,
            public_id: upload.public_id
          });
        }
        await ProductImage.bulkCreate(productImages, { transaction: t });
      }

      const productUrl = `${process.env.FRONTEND_URL}/products/${product.id}`;
      const qrData = await QRCode.toDataURL(productUrl);
      const qrUpload = await cloudinary.uploader.upload(qrData, { folder:"qrcodes" });
      await product.update({ qrCode: qrUpload.secure_url }, { transaction: t });

      await t.commit();

      await auditService.log({
        userId: null,
        action: "PRODUCT_CREATED",
        entityType: "Product",
        entityId: product.id,
        newValue: {
          name: product.name,
          price: product.price,
          storeId: product.storeId
        }
      });

      return Product.unscoped().findByPk(product.id, {
        include: [
          { model: ProductImage, as: "images", attributes: ["url"] },
          {
            model: Inventory,
            as: "inventories",
            attributes: ["id", "productId", "pickupStationId", "quantityOnHand", "quantityReserved", "lowStockThreshold", "isDeleted"]
          }
        ]
      });
    } catch(error){
      await t.rollback();
      throw error;
    }
  }

  async updateProduct(id, data, files) {
    const t = await sequelize.transaction();
    try {
      const product = await Product.unscoped().findOne({
        where: { id, isDeleted: false },
        transaction: t
      });

      if(!product){
        await t.rollback();
        return null;
      }

      const clean = (val, fallback) => {
        if (val === undefined || val === null || val === "") return fallback;
        return val;
      };

      const oldValues = {
        name: product.name,
        price: product.price,
        categoryId: product.categoryId
      };

      await product.update({
        name: clean(data.name, product.name),
        description: clean(data.description, product.description),
        price: clean(data.price, product.price),
        categoryId: clean(data.categoryId, product.categoryId),
        subCategoryId: clean(data.subCategoryId, product.subCategoryId),
        brandId: clean(data.brandId, product.brandId),
        weightKg: clean(data.weightKg, product.weightKg),
        lengthCm: clean(data.lengthCm, product.lengthCm),
        widthCm: clean(data.widthCm, product.widthCm),
        heightCm: clean(data.heightCm, product.heightCm),
        logisticsCategoryId: clean(data.logisticsCategoryId, product.logisticsCategoryId),
        fulfillmentMethod: data.fulfillmentMethod !== undefined
          ? (data.fulfillmentMethod === "HUB_DROPOFF" ? "HUB_DROPOFF" : "RIDER_PICKUP")
          : product.fulfillmentMethod,
        fulfillmentHubId: data.fulfillmentMethod !== undefined
          ? (data.fulfillmentMethod === "HUB_DROPOFF" ? (data.fulfillmentHubId || null) : null)
          : product.fulfillmentHubId,
      }, { transaction: t });

      if (data.discounts !== undefined) {
        let discounts = data.discounts;
        if (typeof discounts === 'string') {
          try {
            discounts = JSON.parse(discounts);
          } catch (e) {
            discounts = [];
          }
        }
        await ProductDiscount.destroy({ where: { productId: id }, transaction: t });
        if (discounts && Array.isArray(discounts) && discounts.length > 0) {
          const discountRecords = discounts
            .filter(d => d.value !== "" && d.value !== undefined && d.value !== null)
            .map(d => ({
              productId: id,
              discountType: d.discountType || 'PERCENTAGE',
              value: d.value,
              minQuantity: d.minQuantity === "" ? 1 : (d.minQuantity || 1),
              maxQuantity: d.maxQuantity === "" ? null : (d.maxQuantity || null),
              startDate: d.startDate || null,
              endDate: d.endDate || null,
              isActive: d.isActive ?? true
            }));
          if (discountRecords.length > 0) {
            await ProductDiscount.bulkCreate(discountRecords, { transaction: t });
          }
        }
      }

      if(data.stockQuantity !== undefined && data.stockQuantity !== ""){
        await Inventory.update({ quantityOnHand: data.stockQuantity }, { where: { productId: id }, transaction: t });
      }

      if(data.pickupStationId){
        await Inventory.update({ pickupStationId: data.pickupStationId }, { where: { productId: id }, transaction: t });
      }

      if(files && files.length){
        const images = [];
        for(const file of files){
          const uploaded = await cloudinary.uploader.upload(file.path, { folder: "products" });
          images.push({ productId: id, url: uploaded.secure_url, public_id: uploaded.public_id });
        }
        await ProductImage.bulkCreate(images, { transaction: t });
      }

      if (data.removedImageIds && Array.isArray(data.removedImageIds) && data.removedImageIds.length > 0) {
        const imagesToDelete = await ProductImage.findAll({
          where: { id: data.removedImageIds },
          transaction: t
        });

        for (const img of imagesToDelete) {
          if (img.public_id) {
            try {
              await cloudinary.uploader.destroy(img.public_id);
            } catch (err) {
              console.error(`Failed to delete image ${img.public_id} from Cloudinary:`, err);
            }
          }
        }

        await ProductImage.destroy({
          where: { id: data.removedImageIds },
          transaction: t
        });
      }

      await t.commit();

      await auditService.log({
        userId: null,
        action: "PRODUCT_UPDATED",
        entityType: "Product",
        entityId: id,
        oldValue: oldValues,
        newValue: {
          name: product.name,
          price: product.price,
          categoryId: product.categoryId
        }
      });

      return Product.unscoped().findByPk(id, {
        include: [
          { model: ProductImage, as: "images", attributes: ["url"] },
          {
            model: Inventory,
            as: "inventories",
            attributes: ["id", "productId", "pickupStationId", "quantityOnHand", "quantityReserved", "lowStockThreshold", "isDeleted"]
          }
        ]
      });
    } catch(error){
      await t.rollback();
      if (error.name === 'SequelizeValidationError') {
        const missingFields = error.errors.map(e => e.path).join(', ');
        throw new Error(`Validation Error: The following fields are invalid or missing: ${missingFields}`);
      }
      throw error;
    }
  }

  async getAllProducts({ limit = 10, offset = 0, search, categoryId, userRole = 'admin' }) {
    const { Op } = require('sequelize');

    let whereClause = { isDeleted: false, status: "approved" };

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
      ];
    }

    if (categoryId) {
      whereClause.categoryId = categoryId;
    }

    if (userRole === 'customer') {
      whereClause[Op.or] = [
        {
          [Op.and]: [
            sequelize.literal(`(
              SELECT SUM(\`quantityOnHand\` - \`quantityReserved\`)
              FROM \`inventories\` AS inv
              WHERE inv.\`productId\` = \`Product\`.id AND inv.\`isDeleted\` = false
            ) > 0`)
          ]
        },
        {
          updatedAt: {
            [Op.gte]: new Date(Date.now() - 48 * 60 * 60 * 1000)
          }
        }
      ];
    }

    const { count, rows: products } = await Product.findAndCountAll({
      where: whereClause,
      include: [
        { model: ProductImage, as: "images", attributes: ["url"] },
        {
          model: Inventory,
          as: "inventories",
          attributes: ["id", "productId", "pickupStationId", "quantityOnHand", "quantityReserved", "lowStockThreshold", "isDeleted"]
        },
        { model: ProductDiscount, as: "discounts" },
        { model: Product.sequelize.models.Category, as: "category", attributes: ["id", "name"] },
        {
          model: Product.sequelize.models.Store,
          as: "store",
          include: [{ model: Product.sequelize.models.User, as: "owner", attributes: ["name"] }]
        }
      ],
      order: [["createdAt", "DESC"]],
      distinct: true,
      limit: limit,
      offset: offset,
    });

    const finalProducts = [];
    for (const product of products) {
      const pJson = product.toJSON();
      const { finalPrice, isDiscounted, originalPrice } = await calculateCurrentPrice(pJson, 1);
      const availableStock = (pJson.inventories || []).reduce(
        (total, inventory) => total + Math.max(
          Number(inventory.quantityOnHand || 0) - Number(inventory.quantityReserved || 0),
          0
        ),
        0
      );
      finalProducts.push({
        ...pJson,
        availableStock,
        currentPrice: finalPrice,
        isDiscounted,
        originalPrice
      });
    }
    return { products: finalProducts, total: count };
  }

  async getPendingApprovalProducts() {
    return Product.unscoped().findAll({
      where: { isDeleted: false, status: "pending_review" },
      include: [{ model: Store, as: "store", attributes: ["id", "name", "ownerUserId"] }],
      order: [["createdAt", "ASC"]],
    });
  }

  async decideApproval(id, decision, rejectionReason, reviewerId) {
    if (!["approved", "rejected"].includes(decision)) throw new Error("Decision must be approved or rejected");
    const product = await Product.unscoped().findByPk(id, { include: [{ model: Store, as: "store" }] });
    if (!product) throw new Error("Product not found");
    if (product.status !== "pending_review") throw new Error(`Product is already ${product.status}`);
    if (decision === "rejected" && !rejectionReason) throw new Error("Rejection reason is required");
    await product.update({
      status: decision,
      rejectionReason: decision === "rejected" ? rejectionReason : null,
      approvalReviewedBy: reviewerId || null,
      approvalReviewedAt: new Date(),
    });
    if (product.store?.ownerUserId) {
      await require("./notificationService").notify(product.store.ownerUserId, {
        type: `PRODUCT_${decision.toUpperCase()}`,
        title: decision === "approved" ? "Product approved" : "Product rejected",
        message: decision === "approved" ? `${product.name} is now live.` : `${product.name} was rejected: ${rejectionReason}`,
        metadata: { productId: product.id, reason: rejectionReason || null },
        sendEmail: true,
      });
    }
    return product;
  }

  async getProductById(id){
    const product = await Product.unscoped().findOne({
      where: { id, isDeleted: false },
      include: [
        { model: ProductImage, as: "images", attributes: ["url"] },
        {
          model: Inventory,
          as: "inventories",
          attributes: ["id", "productId", "pickupStationId", "quantityOnHand", "quantityReserved", "lowStockThreshold", "isDeleted"]
        },
        { model: ProductDiscount, as: "discounts" }
      ]
    });
    if (!product) return null;

    const pJson = product.toJSON();
    pJson.availableStock = (pJson.inventories || []).reduce(
      (total, inv) => total + Math.max(Number(inv.quantityOnHand || 0) - Number(inv.quantityReserved || 0), 0),
      0
    );
    return pJson;
  }

  async getRandomDiscountedProducts(limit = 5) {
    const discountedProducts = await Product.findAll({
      where: { isDeleted: false, status: "approved" },
      include: [
        { model: ProductDiscount, as: "discounts", where: { isActive: true } },
        { model: ProductImage, as: "images", attributes: ["url"] },
      ],
      order: [sequelize.random()],
      limit: limit,
    });

    const results = [];
    for (const product of discountedProducts) {
      const pJson = product.toJSON();
      const { finalPrice, originalPrice } = await calculateCurrentPrice(pJson, 1);
      const discountPercent = originalPrice && finalPrice
        ? Math.round(((originalPrice - finalPrice) / originalPrice) * 100)
        : 0;

      results.push({
        ...pJson,
        currentPrice: finalPrice,
        originalPrice,
        discountPercent,
      });
    }
    return results;
  }

  async getAdvertisedDiscounts() {
      const now = new Date();
      const discounts = await require("../models").Discount.findAll({
        where: {
          displayInAdverts: true,
          isActive: true,
          isDeleted: false,
          [require("sequelize").Op.and]: [
            {
              [require("sequelize").Op.or]: [
                { advertStartDate: null },
                { advertStartDate: { [require("sequelize").Op.lte]: now } },
              ],
            },
            {
              [require("sequelize").Op.or]: [
                { advertEndDate: null },
                { advertEndDate: { [require("sequelize").Op.gte]: now } },
              ],
            },
            {
              [require("sequelize").Op.or]: [
                { expiresAt: null },
                { expiresAt: { [require("sequelize").Op.gte]: now } },
              ],
            },
          ],
        },
        order: [["advertEndDate", "ASC"], ["createdAt", "DESC"]],
        limit: 6,
        attributes: ["id", "title", "code", "type", "value", "advertStartDate", "advertEndDate"],
      });
      return discounts;
  }

  async deleteProduct(id) {
    const product = await Product.unscoped().findOne({ where: { id, isDeleted: false } });
    if (!product) return null;
    await product.update({ isDeleted: true });
    await Inventory.update({ isDeleted: true }, { where: { productId: id } });

    await auditService.log({
      userId: null,
      action: "PRODUCT_DELETED",
      entityType: "Product",
      entityId: id,
      oldValue: { isDeleted: false },
      newValue: { isDeleted: true }
    });

    return product;
  }
}

module.exports = new ProductService();

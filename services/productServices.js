
const { sequelize, Product, ProductImage, Inventory, ProductPickupStation, StorePickupStation } = require("../models");
const QRCode = require("qrcode");
const cloudinary = require("../config/cloudinary");
const InventoryService = require("./inventoryServices");

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
  console.log("Creating product with data:", data);
  try {

    // 1. Create Product
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
      boxSizeId: data.boxSizeId || null,

      logisticsCategoryId: data.logisticsCategoryId || null,

    }, {
      transaction: t
    });

console.log("Product created:", product.toJSON());
    // 2. Create inventory against one or more pickup stations
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
      console.log("Inventory created for pickup station:", data.pickupStationId);
    }
   
    // 3. Upload product images
    let productImages = [];

    if(files && files.length){
      for(const file of files){
        const upload = await cloudinary.uploader.upload(
          file.path,
          {
            folder:"products"
          }
        );


        productImages.push({
          productId: product.id,
          url: upload.secure_url,
          public_id: upload.public_id
        });

      }


      await ProductImage.bulkCreate(
        productImages,
        {
          transaction:t
        }
      );
      console.log("Product images uploaded:", productImages.map(img => img.url));
    }



    // 4. Generate QR Code
    const productUrl =
      `${process.env.FRONTEND_URL}/products/${product.id}`;


    const qrData =
      await QRCode.toDataURL(productUrl);


    const qrUpload =
      await cloudinary.uploader.upload(
        qrData,
        {
          folder:"qrcodes"
        }
      );

      console.log("QR Code uploaded to Cloudinary:", qrUpload.secure_url);
    await product.update(
      {
        qrCode: qrUpload.secure_url
      },
      {
        transaction:t
      }
    );


    await t.commit();



    // 5. Return same structure as GET
    return Product.findByPk(product.id,{
      include:[

        {
          model:ProductImage,
          as:"images",
          attributes:[
            "url"
          ]
        },


        {
          model:Inventory,
          as:"inventories",

          include:[
            {
              model:StorePickupStation,
              as:"pickupStation"
            }
          ]

        }

      ]
    });
console.log("Product creation completed successfully:", product.toJSON());

  } catch(error){
    console.error("Error creating product:", error);
    await t.rollback();

    throw error;

  }

}

  async updateProduct(id, data, files) {

    const t = await sequelize.transaction();

    try {

      const product = await Product.findOne({
        where: {
          id,
          isDeleted:false
        },
        transaction:t
      });


      if(!product){
        await t.rollback();
        return null;
      }


      // Update product fields
      await product.update({

        name: data.name ?? product.name,

        description:
          data.description ?? product.description,

        price:
          data.price ?? product.price,

        categoryId:
          data.categoryId ?? product.categoryId,

        subCategoryId:
          data.subCategoryId ?? product.subCategoryId,

        brandId:
          data.brandId ?? product.brandId,

        weightKg:
          data.weightKg ?? product.weightKg,

        lengthCm:
          data.lengthCm ?? product.lengthCm,

        widthCm:
          data.widthCm ?? product.widthCm,

        heightCm:
          data.heightCm ?? product.heightCm,
        boxSizeId:
          data.boxSizeId ?? product.boxSizeId,

        logisticsCategoryId:
          data.logisticsCategoryId ?? product.logisticsCategoryId


      },{
        transaction:t
      });



      // Update inventory quantity
      if(data.stockQuantity !== undefined){

        await Inventory.update(

          {
            quantityOnHand:data.stockQuantity
          },

          {
            where:{
              productId:id
            },

            transaction:t
          }

        );

      }



      // Change pickup station
      if(data.pickupStationId){

        await Inventory.update(

          {
            pickupStationId:data.pickupStationId
          },

          {
            where:{
              productId:id
            },

            transaction:t
          }

        );

      }



      // Upload new images
      if(files && files.length){

        const images=[];


        for(const file of files){

          const uploaded =
            await cloudinary.uploader.upload(
              file.path,
              {
                folder:"products"
              }
            );


          images.push({

            productId:id,

            url:uploaded.secure_url,

            public_id:uploaded.public_id

          });

        }


        await ProductImage.bulkCreate(
          images,
          {
            transaction:t
          }
        );

      }



      await t.commit();



      return Product.findByPk(id,{

        include:[

          {
            model:ProductImage,
            as:"images",
            attributes:[
              "url"
            ]
          },


          {
            model:Inventory,
            as:"inventories",

            include:[
              {
                model:StorePickupStation,
                as:"pickupStation"
              }
            ]

          }

        ]

      });



    } catch(error){

      await t.rollback();

      throw error;

    }

  }

 

  async getAllProducts() {
    console.log("Fetching all products...");
    return Product.findAll({
      where: { isDeleted: false },
      include: [
        {
          model: ProductImage,
          as: "images",
          attributes: ["url"]
        },
        {
          model: Inventory,
          as: "inventories",
          include: [
            {
              model: StorePickupStation,
              as: "pickupStation"
            }
          ]
        }
      ],
      order: [["createdAt", "DESC"]],
    });
  }
  async getProductById(id){

    return Product.findOne({

      where:{
        id,
        isDeleted:false
      },


      include:[


        {
          model:ProductImage,
          as:"images",
          attributes:[
            "url"
          ]
        },


        {
          model:Inventory,
          as:"inventories",

          include:[

            {
              model:StorePickupStation,
              as:"pickupStation"
            }

          ]

        }


      ]

    });

  }
  async deleteProduct(id) {
    const product = await Product.findOne({ where: { id, isDeleted: false } });
    if (!product) return null;
    // Soft delete both product and its inventory record
    await product.update({ isDeleted: true });
    await Inventory.update({ isDeleted: true }, { where: { productId: id } });
    return product;
  }
}

module.exports = new ProductService();
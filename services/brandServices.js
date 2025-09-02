const Brand = require("../models/brandModel");
class BrandServices {
  async createBrand(data) {
  
    return await Brand.create(data);
  }

  async getAllBrands() {
    return await Brand.findAll({ include: ["products"] });
  }

  async getBrandById(id) {
    return await Brand.findByPk(id, { include: ["products"] });
  }

  async updateBrand(id, data) {
    const brand = await Brand.findByPk(id);
    if (!brand) throw new Error("Brand not found");
    await brand.update(data);
    return brand;
  }

  async deleteBrand(id) {
    const brand = await Brand.findByPk(id);
    if (!brand) throw new Error("Brand not found");
    await brand.destroy();
    return { message: "Brand deleted successfully" };
  }
}

module.exports = new BrandServices();

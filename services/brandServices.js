const Brand = require("../models/brandModel");
class BrandServices {
  async createBrand(data) {
  
    return await Brand.create(data);
  }

  async getAllBrands({ limit, offset, search } = {}) {
    const { Op } = require("sequelize");
    const where = {};
    if (search) where.name = { [Op.like]: `%${search}%` };

    const findOptions = { where, include: ["products"], order: [["name", "ASC"]] };
    if (limit !== undefined) findOptions.limit = limit;
    if (offset !== undefined) findOptions.offset = offset;

    const { count, rows } = await Brand.findAndCountAll(findOptions);
    return { data: rows, total: count };
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

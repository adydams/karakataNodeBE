const brandService = require("../services/brandServices");

class BrandController {
  async create(req, res) {
    try {
      const brand = await brandService.createBrand(req.body);
      res.status(201).json(brand);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  async getAll(req, res) {
    try {
      const brands = await brandService.getAllBrands();
      res.json(brands);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async getById(req, res) {
    try {
      const brand = await brandService.getBrandById(req.params.id);
      if (!brand) return res.status(404).json({ error: "Brand not found" });
      res.json(brand);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async update(req, res) {
    try {
      const brand = await brandService.updateBrand(req.params.id, req.body);
      res.json(brand);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  async delete(req, res) {
    try {
      const result = await brandService.deleteBrand(req.params.id);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
}

module.exports = new BrandController();

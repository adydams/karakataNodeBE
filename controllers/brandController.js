const brandService = require("../services/brandServices");

exports.create = async (req, res) => {
  try {
    
    const brand = await brandService.createBrand(req.body);
    res.status(201).json({ success: true, brand });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const brands = await brandService.getAllBrands();
    res.json({ success: true, brands });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const brand = await brandService.getBrandById(req.params.id);
    if (!brand) {
      return res.status(404).json({ success: false, message: "Brand not found" });
    }
    res.json({ success: true, brand });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const brand = await brandService.updateBrand(req.params.id, req.body);
    res.json({ success: true, brand });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const result = await brandService.deleteBrand(req.params.id);
    res.json({ success: true, result });
  } catch (err) {
    console.error("Create Brand Error:", err.message);
    res.status(400).json({ success: false, message: err.message });
  }
};

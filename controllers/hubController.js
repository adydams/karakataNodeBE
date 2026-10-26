const hubService = require("../services/hubServices");

exports.list = async (req, res, next) => {
  try { return res.json({ success: true, data: await hubService.list() }); } catch (error) { return next(error); }
};
exports.adminList = async (req, res, next) => {
  try { return res.json({ success: true, data: await hubService.list(true) }); } catch (error) { return next(error); }
};
exports.get = async (req, res, next) => {
  try {
    const hub = await hubService.get(req.params.id);
    return hub ? res.json({ success: true, data: hub }) : res.status(404).json({ success: false, message: "Hub not found" });
  } catch (error) { return next(error); }
};
exports.create = async (req, res) => {
  try {
    const { code, name, address, state, country, lga, phone, email, latitude, longitude, isActive } = req.body;
    const missing = [
      ["code", code], ["name", name], ["address", address], ["state", state],
      ["country", country], ["phone", phone], ["email", email],
      ["latitude", latitude], ["longitude", longitude],
    ].filter(([, value]) => !String(value ?? "").trim()).map(([field]) => field);
    if (missing.length) {
      return res.status(400).json({ success: false, message: `Missing required hub fields: ${missing.join(", ")}` });
    }
    return res.status(201).json({ success: true, data: await hubService.create({ code, name, address, state, country, lga, phone, email, latitude, longitude, isActive }) });
  } catch (error) { return res.status(400).json({ success: false, message: error.message }); }
};
exports.update = async (req, res) => {
  try {
    const hub = await hubService.update(req.params.id, req.body);
    return hub ? res.json({ success: true, data: hub }) : res.status(404).json({ success: false, message: "Hub not found" });
  } catch (error) { return res.status(400).json({ success: false, message: error.message }); }
};
exports.remove = async (req, res) => {
  const hub = await hubService.remove(req.params.id);
  return hub ? res.json({ success: true, message: "Hub deleted" }) : res.status(404).json({ success: false, message: "Hub not found" });
};

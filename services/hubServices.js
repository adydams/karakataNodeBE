const Hub = require("../models/hubModel");

module.exports = {
  list: (includeInactive = false) => Hub.findAll({
    where: includeInactive ? undefined : { isActive: true },
    order: [["name", "ASC"]],
  }),
  get: (id) => Hub.findByPk(id),
  create: (data) => Hub.create(data),
  update: async (id, data) => {
    const hub = await Hub.findByPk(id);
    if (!hub) return null;
    await hub.update(data);
    return hub;
  },
  remove: async (id) => {
    const hub = await Hub.findByPk(id);
    if (!hub) return null;
    await hub.destroy();
    return hub;
  },
};

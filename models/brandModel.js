module.exports = (sequelize, DataTypes) => {
  const Brand = sequelize.define("Brand", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.STRING,
    },
    logo: {
      type: DataTypes.STRING, // Cloudinary URL
    },
  });

  Brand.associate = (models) => {
    Brand.hasMany(models.Product, {
      foreignKey: "brandId",
      as: "products",
    });
  };

  return Brand;
};

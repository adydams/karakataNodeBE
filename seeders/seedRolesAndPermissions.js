const bcrypt = require("bcryptjs");
const Role = require("../models/roleModel");
const Permission = require("../models/permissionModel");
const User = require("../models/userModel");

const seedRolesAndPermissions = async () => {
  try {
    // 1️⃣ Create Roles
    const roles = ["SuperAdmin", "SystemAdmin", "Admin", "User"];
    for (const roleName of roles) {
      await Role.findOrCreate({
        where: { name: roleName },
        defaults: {
          id: crypto.randomUUID(), // ensure GUID if your Role model uses UUID as PK
        },
      });
    }

    // 2️⃣ Create Permissions
    const permissionsList = [
      // Admin management
      "admin:create",
      "admin:view",
      "admin:update",
      "admin:delete",
      // Offer letter management
      "offerletter:view",
      "offerletter:approve",
      // Customer management
      "customer:view",
      "customer:update",
    ];

    for (const perm of permissionsList) {
      await Permission.findOrCreate({
        where: { name: perm },
        defaults: { description: `Permission to ${perm}` },
      });
    }

    // 3️⃣ Assign all permissions to SuperAdmin
    const superAdminRole = await Role.findOne({ where: { name: "SuperAdmin" } });
    const allPermissions = await Permission.findAll();
    await superAdminRole.setPermissions(allPermissions);

    // 4️⃣ Create SuperAdmin user (if none exists)
    const existingSuperAdmin = await User.findOne({ where: { email: "superadmin@example.com" } });

    if (!existingSuperAdmin) {
      const hashedPassword = await bcrypt.hash("Super@123", 10);

      await User.create({
        id: crypto.randomUUID(), // optional if User also uses GUID
        name: "Super Administrator",
        email: "superadmin@karakata.com",
        phone: "+2348012345678",
        passwordHash: hashedPassword,
        roleId: superAdminRole.id, // ✅ Use GUID role ID
      });

      console.log("✅ SuperAdmin user created: superadmin@example.com / Super@123");
    } else { 
      console.log("ℹ️ SuperAdmin already exists");
    }

    console.log("✅ Roles, permissions, and SuperAdmin seeded successfully!");
  } catch (err) {
    console.error("❌ Seeding failed:", err);
  }
};

module.exports = seedRolesAndPermissions;

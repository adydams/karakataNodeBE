// services/authServices.js
const User = require('../models/userModel');
const Cart = require('../models/cartModel');
const Role = require('../models/roleModel');
const Store = require('../models/storeModel');

const { hashPassword, comparePassword } = require('../utils/passwords');
const { signToken } = require('../utils/jwt');
const bcrypt = require("bcryptjs");

class AuthServices {
 async register({ name, email, phone, password }) {
  const existing = await User.findOne({ where: { email } });
  if (existing) throw new Error("Email already in use");

  const passwordHash = await hashPassword(password);

  // 👇 default role = Customer
  const customerRole = await Role.findOne({
    where: { name: "Customer" },
  });

  if (!customerRole) {
    throw new Error("Customer role not found in system");
  }

  const user = await User.create({
    name,
    email,
    phone,
    passwordHash,
    roleId: customerRole.id, // ✅ IMPORTANT FIX
  });

  const token = signToken({
    id: user.id,
    role: "Customer", // or customerRole.name
  });

  return { user, token };
}

  // login local
  // async login({ email, password, bool: isAdminLogin})
  //  { 
  //   console.log("Login attempt service:", { email, password: password ? "****" : null, isAdminLogin });
  //   const user = await User.findOne({
  //   where: { email },
  //   include: [{ model: Role, as: 'role' },
  //     {model:store, as : 'store', 
  //       where: isAdminLogin ? { roleId: user.roleId, role: 'Admin' } : {}, 
  //       required: isAdminLogin }
  //   ]
  // });
  // if (!user) throw new Error('Invalid credentials');
   
  // let cart = await Cart.findOne({where: {userId:user.id} })
  //    if (!cart) {
  //   cart = await Cart.create({ userId: user.id });
  //   }
  //   // user may be OAuth-only (no passwordHash)
  //   if (!user.passwordHash) throw new Error('No password set for this account. Use social login.');

  //   const ok = await comparePassword(password, user.passwordHash);
  //   if (!ok) throw new Error('Invalid credentials');

  //   const token = signToken({
  //     id: user.id, 
  //     role:  user.role ? user.role.name : 'user', 
  //     cartId: cart.id ,
  //      store: store.name
        
  //   } ); 
      
  //   return { token };
  // }


 

async login({ email, password, isAdminLogin = false }) {

  //console.log("Login attempt service:", { email });

  const user = await User.findOne({
    where: { email },
    include: [
      { model: Role, as: "role" },
      {
        model: Store,
        as: "store",
        required: false
      }
    ]
  });

  if (!user) throw new Error("Invalid credentials");

  // User must change password first
  if (!user.isActive) {
    return {
      mustChangePassword: true,
      userId: user.id,
      email: user.email
    };
  }

  if (!user.passwordHash) {
    throw new Error("No password set for this account");
  }
  
  const roleName = user.role?.name;

  // 🚨 STOP HERE if admin login is required
  if (isAdminLogin && !["Admin","SuperAdmin", "StoreAdmin"].includes(roleName)) {
    throw new Error("You are not allowed to access admin login");
  }

  const ok = await comparePassword(password, user.passwordHash);
  if (!ok) throw new Error("Invalid credentials");

  // =========================
  // CART (ONLY CUSTOMER)
  // =========================
  let cartId = null;

  if (roleName === "Customer") {
    let cart = await Cart.findOne({
      where: { userId: user.id }
    });

    if (!cart) {
      cart = await Cart.create({ userId: user.id });
    }

    cartId = cart.id;
  }

  // =========================
  // TOKEN PAYLOAD
  // =========================
  const token = signToken({
    id: user.id,
    role: roleName,
    cartId: cartId, // null for admin users
    storeId: user.store?.id || null
  });

  // =========================
  // RESPONSE
  // =========================
  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: roleName,
      isActive: user.isActive,
      store: user.store
        ? {
            id: user.store.id,
            name: user.store.name
          }
        : null
    },
    mustChangePassword: !user.isActive
  };
}

  // find or create from OAuth profile (Google)
  // profile: { id, displayName, emails: [{value}] }
  async findOrCreateFromOAuth(provider, profile) {
    const email = profile.emails && profile.emails[0] && profile.emails[0].value;
    const providerId = profile.id;
    let user = null;

    // 1) If there's a user with same provider+providerId
    user = await User.findOne({ where: { provider, providerId } });
    if (user) {
      const token = signToken({ id: user.id, role: user.role });
      return { user, token };
    }

    // 2) If there's a user with same email, attach provider info
    if (email) {
      user = await User.findOne({ where: { email } });
      if (user) {
        user.provider = provider;
        user.providerId = providerId;
        await user.save();
        const token = signToken({ id: user.id, role: user.role });
        return { user, token };
      }
    }

    // 3) Otherwise create new user
    const name = profile.displayName || (email ? email.split('@')[0] : 'NoName');
    user = await User.create({
      name,
      email: email || null,
      phone: null,
      passwordHash: null,
      role: 'user',
      provider,
      providerId
    });
    const token = signToken({ id: user.id, role: user.role });
    return { user, token };
  }

  // get user by id (for /me)
  async getById(id) {
    return await User.findByPk(id, { attributes: { exclude: ['passwordHash'] } });
  }

  async changePassword(userId, oldPassword, newPassword)
   {
      const user = await User.findByPk(userId); // Sequelize syntax
      if (!user) throw new Error("User not found");

      // Compare old password with stored hash
      const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
      if (!isMatch) throw new Error("Old password is incorrect");

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      const newPasswordHash = await bcrypt.hash(newPassword, salt);

      // Save new password
      user.passwordHash = newPasswordHash;
      await user.save();

      return { message: "Password updated successfully" };
  }

  async changePasswordFirstTime(userId, oldPassword, newPassword) {
    const user = await User.findByPk(userId);
    if (!user) throw new Error("User not found");

    const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isMatch) throw new Error("Old password is incorrect");

    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    user.passwordHash = newPasswordHash;
    user.isActive = true; // Mark as active after first password change
    await user.save();

    return { message: "Password updated successfully and account activated" };
  }


  async updateUser  (id, updates){
  const user = await User.findByPk(id);
  if (!user) throw new Error("User not found");
  await user.update(updates);
  return user;
};

async deleteUser (id) {
  const user = await User.findByPk(id);
  if (!user) throw new Error("User not found");
  await user.destroy();
  return true;
};
  
  

}

module.exports = new AuthServices();

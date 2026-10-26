const { User, Role, sequelize } = require('./models');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function getToken() {
  try {
    const role = await Role.findOne({ where: { name: 'SuperAdmin' } });
    const user = await User.findOne({ where: { roleId: role?.id } });
    if (!user) return;
    const token = jwt.sign({ id: user.id, role: 'SuperAdmin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    process.stdout.write(token);
  } catch (e) {} finally {
    await sequelize.close();
  }
}
getToken();

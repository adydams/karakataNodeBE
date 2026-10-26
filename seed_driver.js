const { User, Role, sequelize } = require('./models');

async function seed() {
  try {
    console.log('Starting driver seeding...');
    
    let role = await Role.findOne({ where: { name: 'Driver' } });
    if (!role) {
      console.log('Creating Driver role...');
      role = await Role.create({ 
        name: 'Driver', 
        description: 'Handles internal deliveries' 
      });
    }
    console.log('Role verified:', role.name);

    const driverEmail = 'senior.captain@karakata.com';
    let driver = await User.findOne({ where: { email: driverEmail } });
    
    if (!driver) {
      console.log('Creating driver "Senior captain"...');
      driver = await User.create({
        name: 'Senior caption',
        email: driverEmail,
        phone: '08012345678',
        passwordHash: 'hashed_password_123', // Dummy hash
        roleId: role.id,
        isActive: true
      });
    } else {
      console.log('Driver already exists.');
    }
    
    console.log('Driver seeded successfully:', driver.name, 'ID:', driver.id);
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await sequelize.close();
  }
}

seed();

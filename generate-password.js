const bcrypt = require('bcryptjs');

async function generatePassword() {
  const password = 'admin123';
  const hash = await bcrypt.hash(password, 12);
  console.log('Password:', password);
  console.log('Hash:', hash);
}

generatePassword();
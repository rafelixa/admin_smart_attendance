// Check user data from database
const supabase = require('../config/db');

async function checkUser() {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .or('full_name.eq.Prabowo Subianto,nim.eq.01082230015')
      .single();

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log('User found:');
    console.log('Full Name:', user.full_name);
    console.log('NIM:', user.nim);
    console.log('Email:', user.email);
    console.log('Role:', user.role);
    console.log('Password Hash:', user.password_hash);

    const { data: admin } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', '00000000000')
      .single();

    console.log('\nAdmin user:');
    console.log('Full Name:', admin.full_name);
    console.log('Role:', admin.role);
    console.log('Password Hash:', admin.password_hash);

  } catch (error) {
    console.error('Error:', error);
  }
}

checkUser();

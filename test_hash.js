const bcrypt = require('bcryptjs');

const hash = '$2a$10$QY3cq5cjhN7OpyAWX2ho4OzkQscjBjd.hVNZXFtnhyK6qWdvl5APO';
console.log('Hash completo:', hash);
console.log('Teste 12345678:', bcrypt.compareSync('12345678', hash));

// Gerar um hash novo para garantir
const newHash = bcrypt.hashSync('12345678', 10);
console.log('Novo hash:', newHash);
console.log('Teste com novo hash:', bcrypt.compareSync('12345678', newHash));

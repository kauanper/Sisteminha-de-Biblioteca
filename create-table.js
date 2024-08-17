import { sql } from './db.js';

// // Usando DROP TABLE ... CASCADE para remover tabelas e dependências
// sql`DROP TABLE IF EXISTS emprestimos CASCADE;`.then(() => {
//     return sql`DROP TABLE IF EXISTS exemplares CASCADE;`;
// }).then(() => {
//     return sql`DROP TABLE IF EXISTS books CASCADE;`;
// }).then(() => {
//     console.log('Tabelas books, exemplares e emprestimos apagadas com sucesso!');
// }).catch(err => {
//     console.error('Erro ao apagar tabelas:', err);
// });

// Tabela para guardar os livros
const createBooksTableQuery = `
    CREATE TABLE IF NOT EXISTS books (
        id          TEXT PRIMARY KEY,
        titulo      TEXT,
        escritor    TEXT,
        paginas     INTEGER,
        quantidade  INTEGER DEFAULT 1
    );  
`;

// Tabela para guardar exemplares de um mesmo livro
const createExemplaresTableQuery = `
    CREATE TABLE IF NOT EXISTS exemplares (
        id          TEXT PRIMARY KEY,
        book_id     TEXT REFERENCES books(id),
        status      TEXT  -- Coluna para indicar se o exemplar está disponível ou reservado
    );
`;  

// Tabela para guardar os exemplares que foram reservados
const createEmprestimosTableQuery = `
    CREATE TABLE IF NOT EXISTS emprestimos (
        id              TEXT PRIMARY KEY,
        exemplar_id     TEXT REFERENCES exemplares(id),
        data_emprestimo TIMESTAMPTZ DEFAULT NOW(),
        data_devolucao  TIMESTAMPTZ,  -- Coluna para armazenar a data de devolução
        status          TEXT DEFAULT 'reservado'  -- Coluna para indicar o status do empréstimo
    );
`;

// Consultas de criação das tabelas
sql.unsafe(createBooksTableQuery)
    .then(() => {
        console.log('Tabela books criada com sucesso!');
        return sql.unsafe(createExemplaresTableQuery);
    })
    .then(() => {
        console.log('Tabela exemplares criada com sucesso!');
        return sql.unsafe(createEmprestimosTableQuery);
    })
    .then(() => {
        console.log('Tabela emprestimos criada com sucesso!');
    })
    .catch(err => {
        console.error('Erro ao criar tabelas:', err);
    });

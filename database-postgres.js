import { randomUUID } from "node:crypto";
import { sql } from './db.js';

export class DatabasePostgres {

    // Lista os livros, com a opção de filtrar por autor.
    // Se o parâmetro 'search' for fornecido, filtra os livros pelo nome do autor.
    // Retorna uma lista única de livros, ignorando exemplares duplicados.
    async list(search) {
        let livros;
    
        if (search) {
            livros = await sql`
                SELECT 
                    exemplar.id AS exemplar_id,
                    book.titulo,
                    book.escritor,
                    book.paginas,
                    book.quantidade
                FROM exemplares exemplar
                JOIN books book ON exemplar.book_id = book.id
                WHERE book.escritor ILIKE ${'%' + search + '%'} 
                  AND exemplar.status IS NULL  -- Apenas exemplares não reservados
                GROUP BY book.id, exemplar.id
                ORDER BY exemplar.id ASC
            `;
        } else {
            livros = await sql`
                SELECT 
                    exemplar.id AS exemplar_id,
                    book.titulo,
                    book.escritor,
                    book.paginas,
                    book.quantidade
                FROM exemplares exemplar
                JOIN books book ON exemplar.book_id = book.id
                WHERE exemplar.status IS NULL  -- Apenas exemplares não reservados
                GROUP BY book.id, exemplar.id
                ORDER BY exemplar.id ASC
            `;
        }
    
        // Remove duplicatas, retornando apenas um exemplar por livro.
        const uniqueLivros = [];
        const seenBooks = new Set();
    
        for (const livro of livros) {
            const bookIdentifier = `${livro.titulo}-${livro.escritor}`;
            if (!seenBooks.has(bookIdentifier)) {
                seenBooks.add(bookIdentifier);
                uniqueLivros.push(livro);
            }
        }
    
        return uniqueLivros;
    }

    // Lista todos os livros que foram reservados, com a opção de pesquisar por título ou autor.
    // Agrega os IDs dos exemplares reservados em um array e retorna a lista agrupada por livro.
    async listReservas(search = null) {
        let query = sql`
            SELECT 
                book.id AS livro_id,
                book.titulo,
                book.escritor,
                book.paginas,
                ARRAY_AGG(exemplar.id) AS exemplares_reservados  -- Agrega os IDs dos exemplares reservados em um array
            FROM exemplares exemplar
            JOIN books book ON exemplar.book_id = book.id
            WHERE exemplar.status = 'reservado'
        `;

        if (search) {
            query = sql`${query} AND (book.titulo ILIKE ${'%' + search + '%'} OR book.escritor ILIKE ${'%' + search + '%'})`;
        }

        query = sql`${query} GROUP BY book.id ORDER BY book.titulo ASC`;

        const reservas = await query;
        return reservas;
    }    

    // Cria um novo livro ou incrementa a quantidade de um livro existente.
    // Se o livro já existir, incrementa a quantidade. Caso contrário, cria um novo livro e exemplar.
    async create(livro) {
        const { titulo, escritor, paginas } = livro;
        
        // Verifica se o livro já existe no banco de dados
        const existingBook = await sql`
            SELECT * FROM books WHERE titulo = ${titulo} AND escritor = ${escritor}
        `;
        
        let livroId;
        
        if (existingBook.length > 0) {
            // Se o livro já existe, pega o ID e incrementa a quantidade
            livroId = existingBook[0].id;
            await sql`
                UPDATE books SET quantidade = quantidade + 1 
                WHERE id = ${livroId}
            `;
        } else {
            // Se o livro não existe, cria um novo registro
            livroId = randomUUID();
            await sql`
                INSERT INTO books(id, titulo, escritor, paginas, quantidade) 
                VALUES (${livroId}, ${titulo}, ${escritor}, ${paginas}, 1)
            `;
        }
        
        // Cria um novo exemplar associado ao livro
        const exemplarId = randomUUID();
        await sql`
            INSERT INTO exemplares(id, book_id) VALUES (${exemplarId}, ${livroId})
        `;
    }

    // Atualiza um exemplar existente, associando-o a um livro novo ou existente.
    // Se o livro associado ao exemplar for alterado, atualiza a quantidade dos livros antigos e novos.
    async update(exemplarId, livro) {
        const { titulo, escritor, paginas } = livro;
    
        // Verifica se o exemplar existe
        const exemplar = await sql`SELECT book_id FROM exemplares WHERE id = ${exemplarId}`;
        if (exemplar.length === 0) {
            return {
                statusCode: 404,
                message: "Exemplar não encontrado"
            };
        }
    
        const oldBookId = exemplar[0].book_id;
    
        // Verifica se o novo livro já existe
        const existingBook = await sql`
            SELECT id FROM books WHERE titulo = ${titulo} AND escritor = ${escritor} AND paginas = ${paginas}
        `;
    
        let newBookId;
    
        if (existingBook.length > 0) {
            // Se o novo livro já existe, atualiza o exemplar para associá-lo ao novo livro
            newBookId = existingBook[0].id;
            await sql`
                UPDATE exemplares SET book_id = ${newBookId} WHERE id = ${exemplarId}
            `;
            await sql`
                UPDATE books SET quantidade = quantidade + 1 WHERE id = ${newBookId}
            `;
        } else {
            // Se o novo livro não existe, cria um novo livro e atualiza o exemplar
            newBookId = randomUUID();
            await sql`
                INSERT INTO books (id, titulo, escritor, paginas, quantidade) 
                VALUES (${newBookId}, ${titulo}, ${escritor}, ${paginas}, 1)
            `;
            await sql`
                UPDATE exemplares SET book_id = ${newBookId} WHERE id = ${exemplarId}
            `;
        }
    
        // Verifica se ainda restam exemplares associados ao livro antigo
        const remainingExemplares = await sql`
            SELECT COUNT(*) AS count FROM exemplares WHERE book_id = ${oldBookId}
        `;
        if (remainingExemplares[0].count == 0) {
            // Se não restar nenhum, deleta o livro antigo
            await sql`DELETE FROM books WHERE id = ${oldBookId}`;
        } else {
            // Caso contrário, decrementa a quantidade
            await sql`
                UPDATE books SET quantidade = quantidade - 1 WHERE id = ${oldBookId}
            `;
        }
    
        return {
            statusCode: 200,
            message: "Exemplar atualizado com sucesso"
        };
    }
    
    // Deleta um exemplar específico e, se não restarem exemplares, deleta o livro correspondente.
    async delete(id) {
        try {
            // Verifica se o exemplar existe
            const exemplar = await sql`SELECT book_id FROM exemplares WHERE id = ${id}`;
        
            if (exemplar.length === 0) {
                return {
                    statusCode: 404,
                    error: "Not Found",
                    message: "Exemplar não encontrado"
                };
            }

            const bookId = exemplar[0].book_id;
    
            // Remove o exemplar
            await sql`DELETE FROM exemplares WHERE id = ${id}`;
    
            // Verifica quantos exemplares restam para o livro
            const remainingExemplares = await sql`
                SELECT COUNT(*) AS count FROM exemplares WHERE book_id = ${bookId}
            `;
    
            if (remainingExemplares[0].count == 0) {
                // Se não restar nenhum, deleta o livro
                await sql`DELETE FROM books WHERE id = ${bookId}`;
            } else {
                // Caso contrário, decrementa a quantidade
                await sql`
                    UPDATE books SET quantidade = quantidade - 1 WHERE id = ${bookId}
                `;
            }
    
            return {
                statusCode: 204,
                message: "Exemplar removido com sucesso"
            };
    
        } catch (error) {
            console.error("Erro ao remover exemplar:", error);
            return {
                statusCode: 500,
                error: "Internal Server Error",
                message: "Ocorreu um erro ao remover o exemplar"
            };
        }
    }
    
    // Reserva um exemplar específico, atualizando o status e registrando o empréstimo.
    async reserveExemplar(exemplarId) {
        const reservaId = randomUUID();
        
        // Verifica se o exemplar existe
        const exemplar = await sql`
            SELECT book_id 
            FROM exemplares 
            WHERE id = ${exemplarId}
        `;
        
        if (exemplar.length === 0) {
            return {
                statusCode: 404,
                message: "Exemplar não encontrado"
            };
        }
        
        const bookId = exemplar[0].book_id;
    
        // Atualiza o status do exemplar para "reservado"
        await sql`
            UPDATE exemplares 
            SET status = 'reservado' 
            WHERE id = ${exemplarId}
        `;
        
        // Insere um registro na tabela de empréstimos
        await sql`
            INSERT INTO emprestimos (id, exemplar_id) 
            VALUES (${reservaId}, ${exemplarId})
        `;
        
        // Decrementa a quantidade disponível do livro
        const result = await sql`
            UPDATE books 
            SET quantidade = quantidade - 1 
            WHERE id = ${bookId}
            RETURNING quantidade
        `;
    
        return reservaId;
    }

    // Obtém um exemplar específico pelo ID.
    async getExemplarById(exemplarId) {
        const exemplares = await sql`
            SELECT * FROM exemplares WHERE id = ${exemplarId}
        `;
        return exemplares.length > 0 ? exemplares[0] : null;
    }

    // Devolve um livro, atualizando o status do exemplar e a quantidade disponível do livro.
    async devolverLivro(exemplar_id, livro_id) {
        // Verifica se o empréstimo está em aberto e se o exemplar corresponde ao livro fornecido
        const emprestimo = await sql`
            SELECT * 
            FROM emprestimos 
            WHERE exemplar_id = ${exemplar_id} 
            AND data_devolucao IS NULL
            AND EXISTS (
                SELECT 1 
                FROM exemplares 
                WHERE id = ${exemplar_id} 
                AND book_id = ${livro_id}
            );
        `;
    
        if (emprestimo.length === 0) {
            return {
                statusCode: 404,
                message: "Empréstimo não encontrado ou já devolvido."
            };
        }
    
        // Atualiza o status do exemplar para disponível
        await sql`
            UPDATE exemplares 
            SET status = NULL 
            WHERE id = ${exemplar_id};
        `;
    
        // Incrementa a quantidade de livros disponíveis
        await sql`
            UPDATE books 
            SET quantidade = quantidade + 1 
            WHERE id = ${livro_id};
        `;
    
        // Marca o empréstimo como devolvido
        await sql`
            UPDATE emprestimos 
            SET data_devolucao = NOW() 
            WHERE exemplar_id = ${exemplar_id};
        `;
    
        return {
            statusCode: 200,
            message: "Livro devolvido com sucesso."
        };
    }    
    
    //BANCO DE DADOS
}

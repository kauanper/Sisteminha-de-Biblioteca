import { fastify } from "fastify";  
import { DatabasePostgres } from "./database-postgres.js";

const serve = fastify();
const database = new DatabasePostgres();

serve.post('/livros', async (request, reply) => {
    const {titulo, escritor, paginas} = request.body;
    
    await database.create({
        titulo,
        escritor,
        paginas, 
    });  

    return reply.status(201).send();
});

serve.get('/livros', async (request, reply) => {
    const search = request.query.search;
    const livros = await database.list(search);

    return reply.send(livros);
});

serve.put('/livros/:id', async (request, reply) => {
    const exemplarId = request.params.id;
    const { titulo, escritor, paginas } = request.body;

    const result = await database.update(exemplarId, {
        titulo,
        escritor,
        paginas,
    });

    if (result.statusCode === 200) {
        return reply.status(200).send(result.message);
    } else if (result.statusCode === 404) {
        return reply.status(404).send(result.message);
    } else {
        return reply.status(500).send(result.message);
    }
});


serve.delete('/livros/:id', async (request, reply) => {
    const livroId = request.params.id;
    const result = await database.delete(livroId);

    if (result.statusCode === 204) {
        return reply.status(204).send();
    } else if (result.statusCode === 404) {
        return reply.status(404).send(result.message);
    } else {
        return reply.status(500).send(result.message);
    }
});

serve.get('/reservas', async (request, reply) => {
    const search = request.query.search;  
    const reservas = await database.listReservas(search);

    return reply.send(reservas);
});

serve.post('/reservas', async (request, reply) => {
    const { exemplarId } = request.body;

    const exemplar = await database.getExemplarById(exemplarId);
    if (!exemplar) {
        return reply.status(404).send({ message: 'Exemplar não encontrado' });
    }

    const reservaId = await database.reserveExemplar(exemplarId);
    if (reservaId) {
        return reply.status(201).send({ reservaId });
    } else {
        return reply.status(500).send({ message: 'Erro ao criar reserva' });
    }
});


serve.post('/devolucoes', async (request, reply) => {
    const { exemplar_id, livro_id } = request.body;

    const result = await database.devolverLivro(exemplar_id, livro_id);

    return reply.status(result.statusCode).send(result.message);
});

serve.listen({ port: 3333 }, (err, address) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(`Server listening at ${address}`);
});
Este é um sistema de gerenciamento de biblioteca construído usando Fastify e PostgreSQL. Ele permite a criação, listagem, atualização, exclusão, reserva e devolução de livros e seus exemplares. O sistema também gerencia a quantidade de exemplares disponíveis de cada livro.

Funcionalidades

Adicionar Livro: Permite adicionar um novo livro ao sistema. Se o livro já existir, a quantidade é incrementada.
Listar Livros: Lista todos os livros disponíveis no sistema. Apenas um exemplar por livro é mostrado, mas a quantidade disponível é indicada.
Atualizar Exemplar: Permite atualizar as informações de um exemplar específico, associando-o a um novo livro ou atualizando o livro existente.
Deletar Exemplar: Remove um exemplar específico. Se todos os exemplares de um livro forem removidos, o livro também é deletado do sistema.
Reservar Exemplar: Permite reservar um exemplar específico, marcando-o como reservado e decrementando a quantidade disponível do livro correspondente.
Listar Reservas: Lista todos os livros que foram reservados, com seus respectivos exemplares.
Devolver Livro: Permite a devolução de um exemplar reservado, atualizando o status do exemplar e incrementando a quantidade disponível do livro.

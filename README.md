# 📝 Cadastro de Usuários — Fullstack (React + Node.js + Prisma + MongoDB)

Um sistema completo de cadastro de usuários com frontend em React + Vite, responsável pela interface, e backend em Node.js + Express + Prisma + MongoDB Atlas, responsável por CRUD, validações de dados e integração completa entre frontend e backend.

---

## 📌 Tecnologias Utilizadas

### Frontend:

-React

-Vite

-Axios

-HTML5 / CSS3 / JS (ES6+)

### Backend:

-Node.js

-Express

-Prisma ORM

-MongoDB Atlas

-CORS

---

## 📁 Funcionalidades

### Frontend:

✔ Exibição da tela de cadastro  

✔ Envio dos dados do usuário para o backend  

✔ Validações simples nos inputs  

✔ Integração com API REST criada no backend

### Backend:

✔ Criar novos usuários

✔ Listar todos os usuários

✔ Excluir usuário

✔ Integração com Prisma ORM

✔ API REST completa

---

## 📡 Endpoints da API
#### 📍 GET /usuarios
Retorna a lista de todos os usuários cadastrados.

#### 📍 POST /usuarios
Cria um novo usuário.

#### 📍 PUT /usuarios/:id
Atualiza os dados de um usuário pelo ID.

#### 📍 DELETE /usuarios/:id
Remove um usuário do banco de dados.

---

## 🗄 Modelo de Dados (Prisma)
```prisma
model User {
  id    String @id @default(auto()) @map("_id") @db.ObjectId
  email String @unique
  name  String
  age   String
}
```

---

## 🚀 Como rodar o projeto

#### Clonar o repositório:
```bash
git clone https://github.com/Gabriel-1812/Cadastro-de-Usuarios-Fullstack.git
```

### Backend:

#### 1️⃣ Entrar na pasta do backend:
```bash
cd .\cadastro-de-usuarios-backend\
```

#### 2️⃣ Instalar as dependências:
```bash
npm install
```

#### 3️⃣ Gere o PrismaClient:
```bash
npx prisma generate
```

#### 4️⃣ Configurar o arquivo .env
Crie um arquivo .env na raiz do projeto e coloque sua string do MongoDB Atlas:
```bash
DATABASE_URL="sua_string_do_mongodb_aqui"
```

#### 5️⃣ Rodar o servidor:
```bash
node server.js
```
O backend estará rodando em:

http://localhost:3000

---

### Frontend:

#### 1️⃣ Entrar na pasta do projeto
```bash
cd .\cadastro-de-usuarios-frontend\
```

#### 2️⃣ Instalar dependências
```bash
npm install
```

#### 3️⃣ Rodar o projeto
```bash
npm run dev
```

O Vite vai mostrar um link como:  
**http://localhost:5173**  
Abra esse endereço no navegador.

import express from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient()


const app = express()
app.use(express.json())
app.use(cors())



app.post("/usuarios", async(req,res) => {
    const {email, name, age} = req.body

    if(!email || !name){
        return res.status(400).json({
            message: "Nome e e-mail são obrigatórios"
        })  
    }
    
    if(!age || age<1){
        return res.status(400).json({
            message:"Idade mínima permitida é 1 ano"
        })
    }

    try {
    const user = await prisma.user.create({
      data: {
        email,
        name,
        age
      }
    })

    return res.status(201).json(user)

  } catch (error) {
    if (error.code === "P2002") { //email duplicado
      return res.status(400).json({
        message: "E-mail já cadastrado"
      })
    }

    return res.status(500).json({
      message: "Erro interno do servidor"
    })
  }
})

app.get("/usuarios", async(req,res) => {
    let users = []
    if(req.query){
        users = await prisma.user.findMany({
            where: {
                name: req.query.name,
                email: req.query.email,
                age: req.query.age
            }
        })

    } else {
        users = await prisma.user.findMany()
    }

    

    res.status(200).json(users)
})

app.put("/usuarios/:id", async(req,res) => {
    
    await prisma.user.update({
        where :{
            id: req.params.id
        },
        data:{
            email: req.body.email,
            name: req.body.name,
            age: req.body.age
        }
    })
    res.status(201).json(req.body)

})

app.delete("/usuarios/:id", async(req,res) => { 
    await prisma.user.delete({
        where :{
            id: req.params.id
        }
    })

    res.status(200).json({message: "Usuário deletado com sucesso!" })
})

app.listen(3000)

const express = require('express')
const app = express();
const cors =require('cors');
const port = process.env.PORT || 8000;
require('dotenv').config()
const jwt = require('jsonwebtoken')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');



app.use(cors())
app.use(express.json())


// jwt 

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization
  
    if (!authHeader) {
      return res.status(401).send({ message: 'unauthorized access' })
    }
    const token = authHeader.split(' ')[1]
  
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
      if (err) {
        return res.status(403).send({ message: 'Forbidden access' })
      }
      console.log(decoded)
      req.decoded = decoded
      next()
    })
  }

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.vjcdyry.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;


const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {

    const userCollection =client.db('bd-calling-task').collection('User')
    const productCollection =client.db('bd-calling-task').collection('Product')
    const commentsCollection =client.db('bd-calling-task').collection('Comments')

  // Save user email & generate JWT
  app.post('/users', async(req,res)=>{
    const user = req.body;

    const query = {email: user.email}
    const existingUser = await userCollection.findOne(query);
    if(existingUser){
        return res.send({message: "user already exists", insertedId:null})
    }
    const result = await userCollection.insertOne(user)
    res.send(result)
  })


// add product
app.post('/product', async (req, res) => {
    try {
      const item = req.body;
      const result = await productCollection.insertOne(item);
      res.status(201).send(result); 
    } catch (error) {
      console.error('Error inserting product:', error);
      res.status(500).send({ error: 'Failed to add product' }); 
    }
  });

//   get all product
app.get('/product', async (req, res) => {
    try {
      const result = await productCollection.find().toArray();
      res.status(200).send(result); // Send a 200 OK status with the result
    } catch (error) {
      console.error('Error fetching menu:', error);
      res.status(500).send({ error: 'Failed to fetch menu' }); // Send a 500 Internal Server Error status with an error message
    }
  });
//   get single product
app.get('/product/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const objectId = new ObjectId(id); // Convert id to ObjectId

        const result = await productCollection.findOne({ _id: objectId });

        if (result) {
            res.status(200).send(result); // Send a 200 OK status with the result
        } else {
            res.status(404).send({ error: 'Product not found' }); // Send a 404 Not Found status if no product is found
        }
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).send({ error: 'Failed to fetch product' }); // Send a 500 Internal Server Error status with an error message
    }
});
  
// add a comments product
app.post('/product/:productId', async (req, res) => {
    try {
        const productId = req.params.productId;
        const { comment, userId, userName, userPhoto,ratings } = req.body;

        // Ensure that productId is a valid ObjectId
        if (!ObjectId.isValid(productId)) {
            return res.status(400).send({ error: 'Invalid product ID' });
        }

        // Prepare the comment document with the product ID and user details
        const commentDocument = {
            productId: productId,  // Convert to ObjectId
            comment: comment,
            userId: new ObjectId(userId),  // Convert to ObjectId
            userName: userName,
            userPhoto: userPhoto,
            ratings:ratings,
            createdAt: new Date()  // Optionally, add a timestamp
        };

        // Insert the comment document into the comments collection
        const result = await commentsCollection.insertOne(commentDocument);

        res.status(201).send(result);
    } catch (error) {
        console.error('Error inserting comment:', error);
        res.status(500).send({ error: 'Failed to add comment' });
    }
});


// Get comments for a product by productId
// app.get('/products/:productId', async (req, res) => {
//     try {
//         const productId = req.params.productId;

//         // Ensure that productId is a valid ObjectId
//         if (!ObjectId.isValid(productId)) {
//             return res.status(400).send({ error: 'Invalid product ID' });
//         }

//         // Query the comments collection for comments with the given productId
//         const comments = await commentsCollection.find({ productId:productId }).toArray();

//         res.status(200).send(comments);
//     } catch (error) {
//         console.error('Error fetching comments:', error);
//         res.status(500).send({ error: 'Failed to fetch comments' });
//     }
// });

// calculate review single product
// app.get('/product/:productId/comments', async (req, res) => {
//     try {
//         const productId = req.params.productId;

//         // Ensure that productId is a valid ObjectId
//         if (!ObjectId.isValid(productId)) {
//             return res.status(400).send({ error: 'Invalid product ID' });
//         }

//         // Find comments for the product and calculate the average rating
//         const comments = await commentsCollection.find({ productId: new ObjectId(productId) }).toArray();

//         // Calculate the average rating
//         const ratings = comments.map(comment => comment.ratings);
//         const averageRating = ratings.reduce((acc, rating) => acc + rating, 0) / ratings.length || 0;

//         res.status(200).send({
//             comments: comments,
//             averageRating: averageRating.toFixed(2) // Format to 2 decimal places
//         });
//     } catch (error) {
//         console.error('Error fetching comments or calculating average rating:', error);
//         res.status(500).send({ error: 'Failed to fetch comments or calculate average rating' });
//     }
// });



app.get('/products/:productId', async (req, res) => {
    try {
        const productId = req.params.productId;

        // Ensure that productId is a valid ObjectId
        if (!ObjectId.isValid(productId)) {
            return res.status(400).send({ error: 'Invalid product ID' });
        }

        // Query the comments collection for comments with the given productId
        const comments = await commentsCollection.find({ productId: productId}).toArray();

        // Calculate the average rating
        const ratings = comments.map(comment => comment.ratings);
        let averageRating = 0;
        if (ratings.length > 0) {
            const sumOfRatings = ratings.reduce((acc, rating) => acc + rating, 0);
            const averageRatingPercentage = (sumOfRatings / ratings.length);
            averageRating = (averageRatingPercentage / 100) * 5; // Normalize to 0-5 scale
        }

        // Ensure average rating does not exceed 5 and round to nearest integer
        averageRating = Math.min(Math.round(averageRating), 5);

        // Send the comments and the average rating
        res.status(200).send({
            comments: comments,
            averageRating: averageRating // Send as integer
        });
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).send({ error: 'Failed to fetch comments' });
    }
});















    app.get('/', (req, res) => {
        res.send('Hello World!')
      })
      
      app.listen(port, () => {
        console.log(`Example app listening on port ${port}`)
      })
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

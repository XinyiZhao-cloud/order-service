// Import required modules
const express = require('express'); // Express is a minimal Node.js framework for building web applications.
const amqp = require('amqplib/callback_api'); // AMQP (Advanced Message Queuing Protocol) client library for RabbitMQ.
const cors = require('cors'); // CORS (Cross-Origin Resource Sharing) middleware for handling cross-origin requests.
require('dotenv').config(); // Load environment variables from .env file in development

const app = express(); // Create an Express application instance.
app.use(express.json()); // Middleware to parse incoming JSON request bodies.

// Enable CORS (Cross-Origin Resource Sharing) for all routes
app.use(cors());

// Lab-3 Define the RabbitMQ connection string, using environment variables with a fallback to localhost.
/*const RABBITMQ_CONNECTION_STRING =
  process.env.RABBITMQ_URL ||
  process.env.RABBITMQ_CONNECTION_STRING ||  // optional backward-compat
  'amqp://localhost';
const PORT = process.env.PORT || 3000;  // Fallback to port 3000 if not defined
*/
// Midterm-Porject: RabbitMQ config (Azure-ready)
// Keep backward-compat for grading + older labs, but prefer RABBITMQ_URL for 12-factor config.
const RABBITMQ_CONNECTION_STRING =
  process.env.RABBITMQ_URL ||                 // (12-factor preferred)
  process.env.RABBITMQ_CONNECTION_STRING ||   // (legacy/optional)
  'amqp://localhost';                         // (local fallback)

// ✅ Queue name (assignment requires order_queue, but env var makes it configurable)
const QUEUE_NAME = process.env.QUEUE_NAME || 'order_queue';

const PORT = process.env.PORT || 3000;  // Fallback to port 3000 if not defined

// Helpful startup log (shows in Azure Log Stream)
console.log('[order-service] RabbitMQ URL:', RABBITMQ_CONNECTION_STRING);
console.log('[order-service] Queue:', QUEUE_NAME);

// Define a POST route for creating orders
app.post('/orders', (req, res) => {
  const order = req.body; // Extract the order data from the request body.
  
  // Connect to RabbitMQ server
  amqp.connect(RABBITMQ_CONNECTION_STRING, (err, conn) => {
    if (err) {
      // If an error occurs while connecting to RabbitMQ, send a 500 status and error message.
      return res.status(500).send('Error connecting to RabbitMQ');
    }

    // Once connected to RabbitMQ, create a channel to communicate with it.
    conn.createChannel((err, channel) => {
      if (err) {
        // If an error occurs while creating a channel, send a 500 status and error message.
        return res.status(500).send('Error creating channel');
      }

      // const queue = 'order_queue'; // Define the queue where the order will be sent.
      //  (old hard-coded version for reference)
      // Midterm-project: use env var for queue name, with fallback to 'order_queue' for grading and older labs.
      const queue = QUEUE_NAME; // ✅ new version (reads from env, defaults to order_queue)
      const msg = JSON.stringify(order); // Convert the order object to a JSON string.

      // Assert (create) the queue if it doesn't already exist.
      channel.assertQueue(queue, { durable: false });

      // Send the order message to the queue.
      channel.sendToQueue(queue, Buffer.from(msg));

      // Log the sent order to the console.
      console.log("Sent order to queue:", msg);

      // Send a response to the client confirming that the order was received.
      res.send('Order received');
    });
  });
});

// Start the server using the port from environment variables
app.listen(PORT, () => {
  console.log(`Order service is running on http://localhost:${PORT}`);
});

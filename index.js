const express = require('express');
const session = require("express-session");
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();
const userRoutes = require('./routes/userRoutes')
const seriesRoutes = require('./routes/seriesRoutes')
const authRoutes = require('./routes/authRoutes')
const taskRoutes = require('./routes/taskRoutes')
const videoRoutes = require('./routes/videoRoutes')
const scheduleRoutes = require('./routes/scheduleRoutes')
const contactRoutes = require('./routes/contactRoutes')
const affiliateRoutes = require('./routes/affiliateRoutes')
const paymentRoutes = require('./routes/paymentRoutes')
const cloudinary = require('./config/cloudinaryConfig')
const { connect } = require('./mongoConnection')
const { getChatGPTAPI, setupChatGPTAPI} = require('./config/gptConfig')
const cron = require('node-cron');
// const gptPromptGenerate = require('./scheduleTask/promptGenerate');
// const { generateMidjourneyImages } = require('./scheduleTask/mainMidjourney');
// const { videoGenerationSchedule } = require('./scheduleTask/videoGenerate');
// const { uploadToYoutube } = require('./scheduleTask/uploadToYoutube');



const app = express();

// Middleware for parsing JSON bodies
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));

// CORS configuration
app.use(cors({
  origin: ["http://localhost:5173", "https://autoshortsfrontend.vercel.app", "https://automovies.click",
    "http://localhost:8001"],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  headers: ["Content-Type", "Authorization"]
}));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true
}));

// app.use('/', (req, res) => {
//   console.log('get route hit')
//   res.send('You can successfully conntected to the backend.')
// })
app.use(userRoutes);
app.use(authRoutes);
app.use(seriesRoutes);
app.use(taskRoutes); 
app.use(videoRoutes); 
app.use(scheduleRoutes); 
app.use(contactRoutes); 
app.use(affiliateRoutes); 
app.use(paymentRoutes); 


async function ensureChatGPTAPI() {
  if (!getChatGPTAPI()) {
      await setupChatGPTAPI();
  }
  return getChatGPTAPI();
}

// Initialize and start the server
async function startServer() {
  try {
    await connect();
    console.log('Connected to MongoDB successfully.');

    // Manually trigger all tasks once at server start
    // await runScheduledTasks();

    // Then set up the cron job to run subsequently every 30 minutes
    // cron.schedule('*/10 * * * *', runScheduledTasks);

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

async function runScheduledTasks() {
  console.log("Scheduled tasks started at:", new Date());
  try {
    await gptPromptGenerate();
    console.log("Completed GPT Prompt Generation");

    await generateMidjourneyImages();
    console.log("Completed Generating Midjourney Images");

    await videoGenerationSchedule();
    console.log("Completed Video Generation Schedule");

    await uploadToYoutube();
    console.log("Completed Uploading to YouTube");
  } catch (taskError) {
    console.error("Error during scheduled tasks:", taskError);
  }
}


startServer();
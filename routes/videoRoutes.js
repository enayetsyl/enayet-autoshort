const express = require('express');
const { getCollections } = require('../mongoConnection');
const { modifyChannelForGPT } = require('../utilities/chatGPT')
const { oAuth2Client } = require('../config/googleOAuth');
const { uploadToYouTube, uploadOwnerGeneratedVideoToYouTube } = require('../utilities/uploadToYoutube');
const { ObjectId } = require('mongodb');
const { refreshAccessToken } = require('../utilities/googleToken');
const { generateVideo } = require('../utilities/generateVideo');

const router = express.Router();
router.use(express.json());

router.post("/upload_video", async (req, res) => {
  const {  cloudinaryUrl, tags, description, thumbnail, title, googleId } = req.body;
  
  // console.log(cloudinaryUrl, tags, description, thumbnale, title, googleId)
   const {userCollection } = await getCollections();
  try {
        
    const tokens = await userCollection.findOne({
      googleId
    });

    if (!tokens) {
      console.error(`No tokens found for the given Google ID. ${googleId}`);

      return res.status(404).json({ message: "Failed to upload video due to unavailability google token" });
    }

    try {
      const newAccessToken = await refreshAccessToken(tokens.refreshToken);

      console.log("New Access Token:", newAccessToken);

      oAuth2Client.setCredentials({
        access_token: newAccessToken,
        refresh_token: tokens.refreshToken,
      });
      
      const youtubeUploadId = await uploadOwnerGeneratedVideoToYouTube(cloudinaryUrl, tags, description, thumbnail, title, googleId, );

      res.status(200).json({ message: "Video uploaded successfully", videoId: youtubeUploadId, googleId: googleId });

    } catch (error) {
      console.error("Error during video upload process:", error);
      res.status(500).json({ message: "Failed during video upload process", error: error });
    }

  } catch (error) {
    console.error("Failed to generate video:", error);
    res.status(500).json({ message: "Failed to generate video ", error: error });
  }
});



router.post("/generate_video", async (req, res) => {
  const {  seriesId } = req.body;
  const {
    scheduleCollection,
    seriesCollection,
    userCollection,
    midjourneyImageCollection,
  } = await getCollections();
  try {
    const seriesData = await seriesCollection.findOne({
      _id: new ObjectId(seriesId),
    });

    if(!seriesData){
      return res.status(404).json({ message: "Failed to generate video due to unavailability of series data" });
      
    }
    const topic = seriesData.content;
    // TODO ACTIVATE IT WHEN MIDJOURNEY API IS WORKING
    // const modifiedChannel = modifyChannelForGPT(topic)
    // const topicId = await main(modifiedChannel, seriesId);

    // TODO DEACTIVATE IT WHEN MIDJOURNEY API IS WORKING
    const topicIds = [
      "098ffce8-5802-42ac-91a6-9c6a06b302f3",
      "de3f1d6b-abbc-454f-b057-1c4bed1c032e",
      "7574a2c3-fbe1-402e-a3ad-a11c88f837db",
      "dfd62ac2-4994-4907-a4a3-37f41c6e027e"
    ];
    const topicId = topicIds[Math.floor(Math.random() * topicIds.length)];
    // const topicId = '098ffce8-5802-42ac-91a6-9c6a06b302f3'
    const generatedVideo = await generateVideo(topicId)
    const tokens = await userCollection.findOne({
      googleId: seriesData.googleId,
    });
    if (!tokens) {
      console.error(`No tokens found for the given Google ID. ${googleId}`);
      return res.status(404).json({ message: "Failed to generate video due to unavailability google token" });
     ;
    }

    try {
      const newAccessToken = await refreshAccessToken(tokens.refreshToken);

      console.log("New Access Token:", newAccessToken);

      oAuth2Client.setCredentials({
        access_token: newAccessToken,
        refresh_token: tokens.refreshToken,
      });
      
      const youtubeUploadId = await uploadToYouTube(topicId);

      res.status(200).json({ message: "Video uploaded successfully", videoId: youtubeUploadId, topicId: topicId });

    } catch (error) {
      console.error("Error during video upload process:", error);
      res.status(500).json({ message: "Failed during video upload process", error: error });
    }

  } catch (error) {
    console.error("Failed to generate video:", error);
    res.status(500).json({ message: "Failed to generate video ", error: error });
  }
});


module.exports = router;

const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { oAuth2Client } = require('../config/googleOAuth');
const { getCollections } = require('../mongoConnection');


const tempFolder = path.join(__dirname, '../tempFolder');

async function downloadFile(url, filePath) {
  const writer = fs.createWriteStream(filePath);
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
  });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

async function uploadOwnerGeneratedVideoToYouTube(cloudinaryUrl, tags, description, thumbnail, title, googleId) {
  
  const youtube = google.youtube({
    version: "v3",
    auth: oAuth2Client,
  });
  
  const videoFilePath = path.join(tempFolder, `${title}.mp4`);
  const thumbnailFilePath = path.join(tempFolder, `${title}_thumbnail.jpg`);
  console.log('videoFilePath', videoFilePath);
  console.log('thumbnailFilePath', thumbnailFilePath);

try {
  await downloadFile(cloudinaryUrl, videoFilePath);

  const response = await youtube.videos.insert({
    part: "snippet,status",
    requestBody: {
      snippet: {
        title: title,
        description: description,
        tags: tags,
      },
      status: {
        privacyStatus: "private",
      },
    },
    media: {
      body: fs.createReadStream(videoFilePath),
    },
  });
  console.log("YouTube response", response);
  console.log(
    `Video uploaded with ID: ${
      response.data.id
    } on ${new Date().toLocaleString()} for topic id: ${googleId}`
  );

  let thumbnailResponse = null;

  // Download and set the thumbnail for the uploaded video
  if (thumbnail) {
    await downloadFile(thumbnail, thumbnailFilePath);

    thumbnailResponse = await youtube.thumbnails.set({
      videoId: response.data.id,
      media: {
        body: fs.createReadStream(thumbnailFilePath),
      },
    });
    console.log(`Thumbnail set for video ID: ${response.data.id}`);
    console.log('Thumbnail response:', thumbnailResponse);
  }


  return response.data.id
} catch (error) {
  throw new Error(`Failed to upload to YouTube: ${error.message} for topic id: ${googleId}`);
}finally {
  // Delete the video from the temporary folder
  fs.unlink(videoFilePath, (err) => {
    if (err) {
      console.error(`Failed to delete temp video file: ${err.message}`);
    } else {
      console.log(`Temp video file deleted: ${videoFilePath}`);
    }
  });
}
}


async function uploadToYouTube(topicId) {
  
  const { midjourneyImageCollection } = await getCollections();
  const youtube = google.youtube({
    version: "v3",
    auth: oAuth2Client,
  });
  const videoFileName = `${topicId}_finalVideo.mp4`;
  const videoFilePath = path.join(__dirname,'..', '/tempFolder', videoFileName);
  const title = await midjourneyImageCollection.findOne(
    { topicId },
    { projection: { topic: 1, _id: 0 } }
  );
  console.log("title", title.topic);

  if (!title || !title.topic) {
    throw new Error(`Title for topicId ${topicId} not found or is undefined.`);
  }
  
  if (!fs.existsSync(videoFilePath)) {
    throw new Error(`Video file does not exist at the specified path for topic is ${topicId}`);
  }

try {
  const response = await youtube.videos.insert({
    part: "snippet,status",
    requestBody: {
      snippet: {
        title: title.topic,
      },
      status: {
        privacyStatus: "private",
      },
    },
    media: {
      body: fs.createReadStream(videoFilePath),
    },
  });
  // console.log("YouTube response", response);
  console.log(
    `Video uploaded with ID: ${
      response.data.id
    } on ${new Date().toLocaleString()} for topic id: ${topicId}`
  );
  return response.data.id
} catch (error) {
  throw new Error(`Failed to upload to YouTube: ${error.message} for topic id: ${topicId}`);
}
}

module.exports= {uploadToYouTube, uploadOwnerGeneratedVideoToYouTube}
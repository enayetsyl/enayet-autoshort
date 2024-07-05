const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { oAuth2Client } = require('../config/googleOAuth')
const { getCollections } = require('../mongoConnection')
require('dotenv').config();
console.log('frontend', process.env.FRONTEND_REDIRECT_URI)
console.log('backend', process.env.GOOGLE_REDIRECT_URI)
 

router.get("/connect_youtube", (req, res) => {
  const state = crypto.randomBytes(20).toString('hex');
  const nonce = crypto.randomBytes(20).toString('hex');

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      "https://www.googleapis.com/auth/youtube.upload",
      "openid",
      "email",
    ],
    include_granted_scopes: true,
    state: state,
    nonce: nonce,
    response_type: 'code',
    prompt: 'consent',
  });

  console.log("redirect url", authUrl);
  res.redirect(authUrl);
});

// OAuth2 callback route
router.get("/oauth2callback", async (req, res) => {
  const { code } = req.query;
  // console.log('code ', code)
  const { userCollection } = await getCollections();
  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    const decoded = jwt.decode(tokens.id_token);
    const user = await userCollection.findOne({ email: decoded.email });

    if (user) {
      await userCollection.updateOne(
        { email: decoded.email },
        {
          $set: {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            googleId: decoded.sub,
          },
        }
      );
    } else {
      const newUser = {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        googleId: decoded.sub,
        email: decoded.email,
      };
      await userCollection.insertOne(newUser);
    }

    const redirectUri = `${process.env.FRONTEND_REDIRECT_URI}?googleId=${decoded.sub}`;
    res.redirect(redirectUri);
  } catch (error) {
    console.error("Error retrieving access token", error);
    res.status(500).send("Authentication failed");
  }
});


module.exports = router;


// {
//   "_id": {
//     "$oid": "6642f61146c0a25ac20d312c"
//   },
//   "googleId": "117809492420944575813",
//   "accessToken": "ya29.a0AXooCgsUnZSFdfIbqX99_mCdYm48sgXzh3HZu2chPbuUSzlcl1F2Wm7CU-u-TxFs-Fvv4GIu29aTOrew178aG3bO5f4ZlCRmTZ-QiC081AaMcQrec3vqL_wcnAc3tWyDI10d75PlC2LQQMg16UUrYkvepcDw0sJtDk00aCgYKAb8SARESFQHGX2MiPbJJC3_zkGdI49oGLES7Xw0171",
//   "refreshToken": "1//06alEasL9cefuCgYIARAAGAYSNwF-L9IrJKNw176LjSSBogIQ8Kda2r7s7cJKDFZeRSz-lCIGfTlEA-NXTv4CwGkWg6cYPaJOev0",
//   "email": "ainewspack-4065977337580806238@pages.plusgoogle.com"
// }
const { oAuth2Client } = require('../config/googleOAuth')

async function refreshAccessToken(refreshToken) {
  oAuth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  try {
    const accessTokenResponse = await oAuth2Client.getAccessToken();
    const accessToken = accessTokenResponse.token;
    return accessToken;
  } catch (error) {
    console.error("Failed to refresh access token:", error);
    throw new Error("Failed to refresh access token");
  }
}

module.exports = { refreshAccessToken }
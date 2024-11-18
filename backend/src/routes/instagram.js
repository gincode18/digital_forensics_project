const express = require("express");
const router = express.Router();
const logger = require("../config/logger");
const {
  getInstagramUserDetails,
  getUserPosts,
  createInstagramUserPdf,
} = require("../services/instagram");

// Instagram endpoints
router.get("/api/v1/instagram/userdetails/:username", async (req, res) => {
  const { username } = req.params;
  logger.info(`Fetching Instagram user details for username: ${username}`);

  try {
    const userDetails = await getInstagramUserDetails(username);
    logger.info(
      `Successfully retrieved Instagram details for user: ${username}`
    );
    res.json({ userdetails: userDetails });
  } catch (error) {
    logger.error("Error fetching Instagram user details:", {
      username,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Failed to fetch Instagram user details" });
  }
});

router.post("/api/v1/instagram/userposts", async (req, res) => {
  const { username, number_of_posts = 1 } = req.body;
  logger.info(`Fetching Instagram posts for user: ${username}`);

  try {
    const userPosts = await getUserPosts(username, number_of_posts);
    logger.info(`Successfully retrieved Instagram posts for user: ${username}`);
    res.json({ userposts: userPosts });
  } catch (error) {
    logger.error("Error fetching Instagram posts:", {
      username,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Failed to fetch Instagram posts" });
  }
});

router.post("/api/v1/instagram/generatereport", async (req, res) => {
  const { username, number_of_posts = 1 } = req.body;
  logger.info(`Generating Instagram report for user: ${username}`);

  try {
    if (!username) {
      logger.warn("Report generation attempted without username");
      return res.status(400).json({ error: "Username is required" });
    }

    logger.info(
      `Starting parallel fetch of Instagram user details and posts for: ${username}`
    );
    const [userDetails, posts] = await Promise.all([
      getInstagramUserDetails(username),
      getUserPosts(username, number_of_posts),
    ]);

    logger.info(`Creating Instagram PDF report for user: ${username}`);
    const pdfName = await createInstagramUserPdf(
      userDetails,
      posts,
      number_of_posts
    );

    logger.info(`Successfully generated Instagram report: ${pdfName}`);
    res.json({
      user_reports: pdfName,
      download_url: `/public/pdf_files/${pdfName}`,
    });
  } catch (error) {
    logger.error("Error generating Instagram report:", {
      username,
      numberOfPosts: number_of_posts,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      error: "Failed to generate Instagram report",
      details: error.message,
    });
  }
});

module.exports = router;
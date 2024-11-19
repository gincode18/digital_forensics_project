const express = require("express");
const router = express.Router();
const logger = require("../config/logger");
const {
  getTwitterUserDetails,
  getUserTweets,
  createTwitterUserPdf,
} = require("../services/twitter");

// Get user details
router.get("/userdetails/:username", async (req, res) => {
  const { username } = req.params;
  logger.info(`Fetching Twitter user details for username: ${username}`);

  try {
    const userDetails = await getTwitterUserDetails(username);
    logger.info(`Successfully retrieved Twitter details for user: ${username}`);
    res.json({ userdetails: userDetails });
  } catch (error) {
    logger.error("Error fetching Twitter user details:", {
      username,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Failed to fetch Twitter user details" });
  }
});

// Get user tweets
router.post("/usertweets", async (req, res) => {
  const { username, number_of_tweets = 1 } = req.body;
  logger.info(`Fetching tweets for user: ${username}`);

  try {
    const userTweets = await getUserTweets(username, "user", number_of_tweets);
    logger.info(`Successfully retrieved tweets for user: ${username}`);
    res.json({ usertweets: userTweets });
  } catch (error) {
    logger.error("Error fetching tweets:", {
      username,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Failed to fetch tweets" });
  }
});

// Generate forensic report
router.post("/generatereport", async (req, res) => {
  const { username, number_of_tweets = 30 } = req.body;
  logger.info(`Creating forensic report for user: ${username}`);

  try {
    if (!username) {
      logger.warn("Report generation attempted without username");
      return res.status(400).json({ error: "Username is required" });
    }

    logger.info(
      `Starting parallel fetch of Twitter user details and tweets for: ${username}`
    );
    // const [userDetails, tweets] = await Promise.all([
    //   getTwitterUserDetails(username),
    //   getUserTweets(username, "user", number_of_tweets)
    // ]);
    const userDetails = {
      userdetails: {
        name: "Elon Musk@elonmusk",
        username: "elonmusk",
        bio: "The people voted for major government reform",
        joined: "June 2009",
        website: "https://twitter.com/elonmusk",
        verified: false,
        location: "",
        stats: {
          following: 834,
          followers: 0,
        },
      },
    };

    const tweets = {
      usertweets: [
        {
          id: "1858762490714485024",
          text: "That is just the tip of the iceberg.\n\nThe actual fraud and waste in government spending is much higher.",
          date: "2024-11-19T06:41:26.000Z",
          likes: 37000,
          retweets: 10000,
          comments: 3800,
          twitter_link:
            "https://twitter.com/elonmusk/status/1858762490714485024",
        },
        {
          id: "1519480761749016577",
          text: "Next I’m buying Coca-Cola to put the cocaine back in",
          date: "2022-04-28T00:56:58.000Z",
          likes: 4400000,
          retweets: 784000,
          comments: 176000,
          twitter_link:
            "https://twitter.com/elonmusk/status/1519480761749016577",
        },
        {
          id: "1812258574049157405",
          text: "",
          date: "2024-07-13T22:51:28.000Z",
          likes: 3400000,
          retweets: 458000,
          comments: 73000,
          twitter_link:
            "https://twitter.com/elonmusk/status/1812258574049157405",
        },
        {
          id: "1518623997054918657",
          text: "I hope that even my worst critics remain on Twitter, because that is what free speech means",
          date: "2022-04-25T16:12:30.000Z",
          likes: 2900000,
          retweets: 403000,
          comments: 166000,
          twitter_link:
            "https://twitter.com/elonmusk/status/1518623997054918657",
        },
        {
          id: "1854026234339938528",
          text: "The future is gonna be so",
          date: "2024-11-06T05:01:15.000Z",
          likes: 2700000,
          retweets: 235000,
          comments: 60000,
          twitter_link:
            "https://twitter.com/elonmusk/status/1854026234339938528",
        },
        {
          id: "1519495072802390016",
          text: "Let’s make Twitter maximum fun!",
          date: "2022-04-28T01:53:50.000Z",
          likes: 2400000,
          retweets: 208000,
          comments: 106000,
          twitter_link:
            "https://twitter.com/elonmusk/status/1519495072802390016",
        },
        {
          id: "1518677066325053441",
          text: "Yesss!!!",
          date: "2022-04-25T19:43:22.000Z",
          likes: 2400000,
          retweets: 374000,
          comments: 137000,
          twitter_link:
            "https://twitter.com/elonmusk/status/1518677066325053441",
        },
        {
          id: "1519495982723084290",
          text: "Listen, I can’t do miracles ok",
          date: "2022-04-28T01:57:27.000Z",
          likes: 2300000,
          retweets: 217000,
          comments: 72000,
          twitter_link:
            "https://twitter.com/elonmusk/status/1519495982723084290",
        },
        {
          id: "1854201929519247803",
          text: "It is morning in America again",
          date: "2024-11-06T16:39:24.000Z",
          likes: 2400000,
          retweets: 237000,
          comments: 71000,
          twitter_link:
            "https://twitter.com/elonmusk/status/1854201929519247803",
        },
        {
          id: "1812256998588662068",
          text: "I fully endorse President Trump and hope for his rapid recovery",
          date: "2024-07-13T22:45:13.000Z",
          likes: 2300000,
          retweets: 403000,
          comments: 89000,
          twitter_link:
            "https://twitter.com/elonmusk/status/1812256998588662068",
        },
        {
          id: "1585841080431321088",
          text: "the bird is freed",
          date: "2022-10-28T03:49:11.000Z",
          likes: 2200000,
          retweets: 365000,
          comments: 134000,
          twitter_link:
            "https://twitter.com/elonmusk/status/1585841080431321088",
        },
        {
          id: "1586104694421659648",
          text: "Comedy is now legal on Twitter",
          date: "2022-10-28T21:16:42.000Z",
          likes: 2100000,
          retweets: 260000,
          comments: 84000,
          twitter_link:
            "https://twitter.com/elonmusk/status/1586104694421659648",
        },
        {
          id: "1854034776815972649",
          text: "Let that sink in",
          date: "2024-11-06T05:35:11.000Z",
          likes: 2200000,
          retweets: 257000,
          comments: 66000,
          twitter_link:
            "https://twitter.com/elonmusk/status/1854034776815972649",
        },
        {
          id: "1820685675899072930",
          text: "",
          date: "2024-08-06T04:57:46.000Z",
          likes: 2100000,
          retweets: 153000,
          comments: 25000,
          twitter_link:
            "https://twitter.com/elonmusk/status/1820685675899072930",
        },
        {
          id: "1814201134371709386",
          text: "",
          date: "2024-07-19T07:30:31.000Z",
          likes: 1000000,
          retweets: 85000,
          comments: 15000,
          twitter_link:
            "https://twitter.com/elonmusk/status/1814201134371709386",
        },
        {
          id: "1594500655724609536",
          text: "And lead us not into temptation …",
          date: "2022-11-21T01:19:15.000Z",
          likes: 990000,
          retweets: 106000,
          comments: 64000,
          twitter_link:
            "https://twitter.com/elonmusk/status/1594500655724609536",
        },
        {
          id: "1524883482836623373",
          text: "Biden’s mistake is that he thinks he was elected to transform the country, but actually everyone just wanted less drama",
          date: "2022-05-12T22:45:27.000Z",
          likes: 995000,
          retweets: 97000,
          comments: 55000,
          twitter_link:
            "https://twitter.com/elonmusk/status/1524883482836623373",
        },
        {
          id: "1625377144137461761",
          text: "There are no coincidences",
          date: "2023-02-14T06:11:23.000Z",
          likes: 982000,
          retweets: 92000,
          comments: 23000,
          twitter_link:
            "https://twitter.com/elonmusk/status/1625377144137461761",
        },
        {
          id: "1817357502725407024",
          text: "",
          date: "2024-07-28T00:32:48.000Z",
          likes: 987000,
          retweets: 154000,
          comments: 47000,
          twitter_link:
            "https://twitter.com/elonmusk/status/1817357502725407024",
        },
        {
          id: "1587911540770222081",
          text: "Your feedback is appreciated, now pay $8",
          date: "2022-11-02T20:56:27.000Z",
          likes: 983000,
          retweets: 87000,
          comments: 41000,
          twitter_link:
            "https://twitter.com/elonmusk/status/1587911540770222081",
        },
      ],
    };
    logger.info(`Creating Twitter PDF report for user: ${username}`);
    const pdfName = await createTwitterUserPdf(
      userDetails,
      tweets,
      number_of_tweets
    );

    logger.info(`Successfully generated forensic report: ${pdfName}`);
    res.json({
      user_reports: pdfName,
      download_url: `http://localhost:3000/public/pdf_files/${pdfName}`,
    });
  } catch (error) {
    logger.error("Error generating report:", {
      username,
      numberOfTweets: number_of_tweets,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      error: "Failed to generate report",
      details: error.message,
    });
  }
});

module.exports = router;

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
      name: "Narendra Modi@narendramodi",
      username: "narendramodi",
      bio: "Prime Minister of India",
      joined: "January 2009",
      website: "narendramodi.in",
      verified: false,
      location: "India",
      stats: {
        following: 2679,
        followers: 103700000,
      },
    };

    const tweets = [
      {
        id: "1858928833610871243",
        text: "At the G20 Summit in Rio de Janeiro today, I spoke on a topic which is very important for the future of the planet- Sustainable Development and Energy Transition. I reiterated India’s steadfast commitment to the Sustainable Development Agenda. Over the past decade, India has",
        date: "2024-11-19T17:42:25.000Z",
        likes: 1300,
        retweets: 285,
        comments: 105,
        twitter_link:
          "https://twitter.com/narendramodi/status/1858928833610871243",
      },
      {
        id: "1858928837784129927",
        text: "We in India, guided by our cultural values, have been the first to fulfil the Paris Agreement commitments ahead of schedule. Building on this, we are accelerating towards more ambitious goals in sectors like renewable energy. Our effort of the world’s largest solar rooftop",
        date: "2024-11-19T17:42:26.000Z",
        likes: 218,
        retweets: 61,
        comments: 11,
        twitter_link:
          "https://twitter.com/narendramodi/status/1858928837784129927",
      },
      {
        id: "1858928840435003436",
        text: "India is sharing its successful initiatives with the Global South, focussing on affordable climate finance and technology access. From launching the Global Biofuels Alliance and promoting ‘One Sun One World One Grid’ to planting a billion trees under ‘Ek Ped Maa Ke Naam’, we",
        date: "2024-11-19T17:42:27.000Z",
        likes: 219,
        retweets: 64,
        comments: 14,
        twitter_link:
          "https://twitter.com/narendramodi/status/1858928840435003436",
      },
      {
        id: "1858924401892487362",
        text: "Had an outstanding meeting with President Javier Milei of Argentina. India cherishes the close friendship with Argentina. Our Strategic Partnership marks 5 years, adding immense vibrancy to bilateral relations. We talked about enhancing ties in energy, defence production, trade",
        date: "2024-11-19T17:24:49.000Z",
        likes: 4200,
        retweets: 608,
        comments: 144,
        twitter_link:
          "https://twitter.com/narendramodi/status/1858924401892487362",
      },
      {
        id: "1858923223108514173",
        text: "Tuve una excelente reunión con el Presidente Javier Milei de Argentina. La India aprecia la estrecha amistad con Argentina. Nuestra Asociación Estratégica cumple 5 años, sumando una gran vitalidad a las relaciones bilaterales. Conversamos sobre la mejora de los lazos en materia",
        date: "2024-11-19T17:20:08.000Z",
        likes: 2800,
        retweets: 459,
        comments: 105,
        twitter_link:
          "https://twitter.com/narendramodi/status/1858923223108514173",
      },
      {
        id: "1858920113187041760",
        text: "Sharing my remarks during meeting with PM Albanese of Australia. @AlboMP",
        date: "2024-11-19T17:07:46.000Z",
        likes: 4500,
        retweets: 918,
        comments: 277,
        twitter_link:
          "https://twitter.com/narendramodi/status/1858920113187041760",
      },
      {
        id: "1858895770428338575",
        text: "Me reuní con el Presidente de Chile, el Sr. Gabriel Boric Font en Río de Janeiro. Los lazos de la India con Chile se están fortaleciendo en varios sectores. Nuestra conversación se centró en cómo profundizar las relaciones en los sectores farmacéuticos, tecnológicos y espaciales,",
        date: "2024-11-19T15:31:02.000Z",
        likes: 6100,
        retweets: 994,
        comments: 225,
        twitter_link:
          "https://twitter.com/narendramodi/status/1858895770428338575",
      },
      {
        id: "1858895571219869771",
        text: "Met the President of Chile, Mr. Gabriel Boric Font in Rio de Janeiro. India’s ties with Chile are getting stronger across various sectors. Our talks focused on how to deepen relations in pharmaceuticals, technology, space and more. It is gladdening to see Ayurveda gaining",
        date: "2024-11-19T15:30:15.000Z",
        likes: 12000,
        retweets: 1600,
        comments: 223,
        twitter_link:
          "https://twitter.com/narendramodi/status/1858895571219869771",
      },
      {
        id: "1858862147834622399",
        text: "Held talks with President Lula during the G20 Summit in Rio de Janeiro. Complimented him on various efforts of Brazil during their G20 Presidency. We took stock of the full range of bilateral ties between our nations and reaffirmed our commitment to improving cooperation in",
        date: "2024-11-19T13:17:26.000Z",
        likes: 22000,
        retweets: 2800,
        comments: 421,
        twitter_link:
          "https://twitter.com/narendramodi/status/1858862147834622399",
      },
      {
        id: "1858694763899175145",
        text: "Met @EU_Commission President Ursula von der Leyen. India will keep working closely with EU for global good. \n\n@vonderleyen",
        date: "2024-11-19T02:12:19.000Z",
        likes: 29000,
        retweets: 3600,
        comments: 485,
        twitter_link:
          "https://twitter.com/narendramodi/status/1858694763899175145",
      },
      {
        id: "1858694480313909506",
        text: "Great interaction with President Abdel Fattah El-Sisi of Egypt during the first day of the Rio G20 Summit. \n\n@AlsisiOfficial",
        date: "2024-11-19T02:11:11.000Z",
        likes: 36000,
        retweets: 4000,
        comments: 453,
        twitter_link:
          "https://twitter.com/narendramodi/status/1858694480313909506",
      },
      {
        id: "1858694211475734889",
        text: "Tributes to our former Prime Minister, Smt. Indira Gandhi Ji on her birth anniversary.",
        date: "2024-11-19T02:10:07.000Z",
        likes: 33000,
        retweets: 2500,
        comments: 776,
        twitter_link:
          "https://twitter.com/narendramodi/status/1858694211475734889",
      },
      {
        id: "1858693999697006989",
        text: "Birthday wishes to Union Minister Shri Kiren Rijiju Ji. He is making noteworthy contributions, especially in ensuring Parliamentary productivity and in ensuring the fruits of development reach all sections of society. May he lead a long and healthy life. @KirenRijiju",
        date: "2024-11-19T02:09:17.000Z",
        likes: 14000,
        retweets: 2000,
        comments: 379,
        twitter_link:
          "https://twitter.com/narendramodi/status/1858693999697006989",
      },
      {
        id: "1858693774919991594",
        text: "Tributes to the fearless Rani Lakshmibai of Jhansi, a true embodiment of courage and patriotism, on her Jayanti. Her bravery and efforts in the fight for freedom continues to inspire generations. Her leadership during times of adversity showed what true determination is.",
        date: "2024-11-19T02:08:23.000Z",
        likes: 26000,
        retweets: 4800,
        comments: 429,
        twitter_link:
          "https://twitter.com/narendramodi/status/1858693774919991594",
      },
      {
        id: "1858639459647959472",
        text: "Had an extremely productive meeting with Prime Minister Keir Starmer in Rio de Janeiro. For India, the Comprehensive Strategic Partnership with the UK is of immense priority. In the coming years, we are eager to work closely in areas such as technology, green energy, security,",
        date: "2024-11-18T22:32:33.000Z",
        likes: 19000,
        retweets: 3000,
        comments: 347,
        twitter_link:
          "https://twitter.com/narendramodi/status/1858639459647959472",
      },
      {
        id: "1858622764284084646",
        text: "C'est toujours une immense joie de rencontrer mon ami, le président Emmanuel Macron. Je l'ai félicité pour l'organisation réussie des Jeux olympiques et paralympiques de Paris au début de cette année. Nous avons parlé de la façon dont l'Inde et la France continueront à travailler",
        date: "2024-11-18T21:26:13.000Z",
        likes: 16000,
        retweets: 2500,
        comments: 220,
        twitter_link:
          "https://twitter.com/narendramodi/status/1858622764284084646",
      },
      {
        id: "1858622532079022556",
        text: "It is always a matter of immense joy to meet my friend, President Emmanuel Macron. Complimented him on the successful hosting of the Paris Olympics and Paralympics earlier this year. We talked about how India and France will keep working closely in sectors like space, energy, AI",
        date: "2024-11-18T21:25:17.000Z",
        likes: 42000,
        retweets: 5000,
        comments: 291,
        twitter_link:
          "https://twitter.com/narendramodi/status/1858622532079022556",
      },
    ];

    logger.info(`Creating Twitter PDF report for user: ${username}`);
    const pdfName = await createTwitterUserPdf(
      userDetails,
      tweets,
      number_of_tweets
    );

    logger.info(`Successfully generated forensic report: ${pdfName}`);
    res.json({
      user_reports: pdfName,
      download_url: `http://localhost:3000/${pdfName}`,
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

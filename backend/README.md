# Social Media Forensics API

A comprehensive API service for social media forensics analysis, currently supporting Twitter and Instagram platforms. This service provides detailed user analysis, content forensics, and behavioral pattern recognition.

## Features

- User profile analysis
- Tweet/Post content analysis
- Sentiment analysis
- Behavioral pattern recognition
- Risk assessment
- PDF report generation
- Activity visualization
- Comprehensive logging

## Prerequisites

- Node.js (v14 or higher)
- Twitter API Bearer Token
- Instagram credentials (for Instagram analysis)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/social-media-forensics-api.git
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
API_HOST=localhost
API_PORT=3000
LOG_LEVEL=info
TWITTER_BEARER_TOKEN=your_bearer_token_here
INSTAGRAM_USERNAME=your_instagram_username
INSTAGRAM_PASSWORD=your_instagram_password
INSTAGRAM_PROXY=http://your-proxy-url:port  # Optional
```

4. Start the server:
```bash
npm run dev
```

## API Endpoints

### Twitter API Endpoints

#### 1. Get User Details
```bash
curl -X GET "http://localhost:3000/api/v1/twitter/userdetails/elonmusk"
```

Sample Response:
```json
{
  "userdetails": {
    "name": "Elon Musk",
    "username": "elonmusk",
    "bio": "...",
    "joined": "2009-06-02T20:12:29.000Z",
    "website": "https://twitter.com/elonmusk",
    "verified": true,
    "location": "Silicon Valley",
    "stats": {
      "tweets": 24521,
      "following": 177,
      "followers": 151800000,
      "likes": 21400
    }
  }
}
```

#### 2. Get User Tweets
```bash
curl -X POST "http://localhost:3000/api/v1/twitter/usertweets" \
-H "Content-Type: application/json" \
-d '{"username": "elonmusk", "number_of_tweets": 10}'
```

Sample Response:
```json
{
  "usertweets": [
    {
      "id": "1234567890",
      "twitter_link": "https://twitter.com/elonmusk/status/1234567890",
      "text": "Sample tweet text",
      "date": "2024-01-17T10:30:00.000Z",
      "likes": 50000,
      "comments": 5000,
      "retweets": 10000,
      "quotes": 1000
    }
  ]
}
```

#### 3. Generate Forensic Report
```bash
curl -X POST "http://localhost:3000/api/v1/twitter/generatereport" \
-H "Content-Type: application/json" \
-d '{"username": "elonmusk", "number_of_tweets": 30}'
```

Sample Response:
```json
{
  "user_reports": "elonmusk_forensic_report.pdf",
  "download_url": "/public/pdf_files/elonmusk_forensic_report.pdf"
}
```

### Instagram API Endpoints

#### 1. Get User Details
```bash
curl -X GET "http://localhost:3000/api/v1/instagram/userdetails/zuck"
```

Sample Response:
```json
{
  "userdetails": {
    "name": "Mark Zuckerberg",
    "username": "zuck",
    "bio": "...",
    "website": "https://instagram.com/zuck",
    "stats": {
      "posts": 150,
      "following": 500,
      "followers": 12000000
    }
  }
}
```

#### 2. Get User Posts
```bash
curl -X POST "http://localhost:3000/api/v1/instagram/userposts" \
-H "Content-Type: application/json" \
-d '{"username": "zuck", "number_of_posts": 10}'
```

Sample Response:
```json
{
  "userposts": [
    {
      "id": "1234567890",
      "link": "https://instagram.com/p/1234567890",
      "caption": "Sample post caption",
      "date": "2024-01-17T10:30:00.000Z",
      "likes": 100000,
      "comments": 5000
    }
  ]
}
```

#### 3. Generate Forensic Report
```bash
curl -X POST "http://localhost:3000/api/v1/instagram/generatereport" \
-H "Content-Type: application/json" \
-d '{"username": "zuck", "number_of_posts": 30}'
```

Sample Response:
```json
{
  "user_reports": "zuck_forensic_report.pdf",
  "download_url": "/public/pdf_files/zuck_forensic_report.pdf"
}
```

## Report Contents

The generated forensic reports include:

1. **Profile Overview**
   - Basic account information
   - Account age and verification status
   - Location and website details

2. **Profile Metrics Analysis**
   - Followers/Following ratio
   - Average posts per day
   - Engagement rate analysis

3. **Content Analysis**
   - Overall sentiment analysis
   - Top hashtags usage
   - Mention patterns
   - Content themes

4. **Behavioral Analysis**
   - Posting patterns
   - Peak activity hours
   - Weekly activity distribution
   - Activity visualization charts

5. **Risk Indicators**
   - Account age assessment
   - Posting frequency analysis
   - Sentiment volatility
   - Suspicious patterns

6. **Recent Activity Analysis**
   - Detailed breakdown of recent posts
   - Individual post sentiment
   - Engagement metrics

## Error Handling

All endpoints return appropriate HTTP status codes:

- 200: Successful request
- 400: Bad request (missing parameters)
- 401: Unauthorized (invalid credentials)
- 404: Resource not found
- 500: Internal server error

Error Response Format:
```json
{
  "error": "Error message",
  "details": "Detailed error description"
}
```

## Logging

The application maintains detailed logs in:
- `logs/error.log`: Error-level logs
- `logs/combined.log`: All logs (info, warn, error)

## License

MIT License

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request
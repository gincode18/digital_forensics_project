# Social Media Forensics API  

A comprehensive API service for social media forensics analysis, focusing on Twitter data collected through web scraping. This service provides detailed user analysis, content forensics, and behavioral pattern recognition.  

## Features  

- User profile analysis  
- Tweet content analysis  
- Sentiment analysis  
- Behavioral pattern recognition  
- Risk assessment  
- PDF report generation  
- Activity visualization  
- Word cloud generation  
- Engagement heatmap  
- Interaction network graph  
- Enhanced recommendations  

## Prerequisites  

- Node.js (v14 or higher)  

## Installation  

1. Clone the repository:  
```bash  
git clone https://github.com/yourusername/social-media-forensics-api.git  
```  

2. Install dependencies:  
```bash  
npm install  
```  

3. Start the server:  
```bash  
npm run dev  
```  

## API Endpoints  

### Twitter API Endpoints  

#### 1. Get User Details  
```bash  
curl -X GET "http://localhost:3000/api/v1/twitter/userdetails/elonmusk"  
```  

**Sample Response**:  
```json  
{  
  "userdetails": {  
    "name": "Elon Musk",  
    "username": "elonmusk",  
    "bio": "The people voted for major government reform",  
    "joined": "June 2009",  
    "website": "https://x.com/elonmusk",  
    "verified": false,  
    "location": "",  
    "stats": {  
      "following": 833,  
      "followers": 0  
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

**Sample Response**:  
```json  
{  
  "usertweets": [  
    {  
      "id": "1858991588187533428",  
      "twitter_link": "https://twitter.com/elonmusk/status/1858991588187533428",  
      "text": "8 minutes to liftoff of Starship!",  
      "date": "2024-11-19T21:51:47.000Z",  
      "likes": 96000,  
      "comments": 6600,  
      "retweets": 2,  
      "type": "retweet"  
    },  
    {  
      "id": "1519480761749016577",  
      "twitter_link": "https://twitter.com/elonmusk/status/1519480761749016577",  
      "text": "Next I’m buying Coca-Cola to put the cocaine back in",  
      "date": "2022-04-28T00:56:58.000Z",  
      "likes": 4400000,  
      "comments": 176000,  
      "retweets": 2,  
      "type": "reply"  
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

**Sample Response**:  
```json  
{  
  "user_reports": "elonmusk_forensic_report.pdf",  
  "download_url": "/public/pdf_files/elonmusk_forensic_report.pdf"  
}  
```  

## Report Contents  

The generated forensic reports include:  

1. **Profile Overview**  
   - Basic account information  
   - Account age and verification status  
   - Website details  

2. **Profile Metrics Analysis**  
   - Followers/Following ratio  
   - Average tweets per day  
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
   - Detailed breakdown of recent tweets  
   - Individual tweet sentiment  
   - Engagement metrics  

7. **Visualizations**  
   - Word cloud of frequently used terms  
   - Engagement heatmap  
   - Interaction network graph  

8. **Recommendations**  
   - Enhanced recommendations based on sentiment and activity patterns  

## Error Handling  

All endpoints return appropriate HTTP status codes:  

- 200: Successful request  
- 400: Bad request (missing parameters)  
- 404: Resource not found  
- 500: Internal server error  

**Error Response Format**:  
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
import { useState } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Heart, MessageCircle, Repeat, Share2 } from 'lucide-react'

interface Tweet {
  id: string
  text: string
  date: string
  likes: number
  retweets: number
  comments: number
  twitter_link: string
}

interface UserTweetsViewProps {
  tweets: Tweet[]
  username: string
}

export default function UserTweetsView({ tweets, username }: UserTweetsViewProps) {
  const [expandedTweet, setExpandedTweet] = useState<string | null>(null)

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    return new Date(dateString).toLocaleDateString(undefined, options)
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toString()
  }

  return (
    <div className="space-y-4">
      {tweets.map((tweet) => (
        <Card key={tweet.id} className="w-full">
          <CardHeader>
            <div className="flex items-center space-x-4">
              <Avatar>
                <AvatarImage src={`https://unavatar.io/twitter/${username}`} alt={username} />
                <AvatarFallback>{username[0].toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg">{username}</CardTitle>
                <p className="text-sm text-gray-500">@{username} · {formatDate(tweet.date)}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-800">
              {expandedTweet === tweet.id ? tweet.text : tweet.text.slice(0, 280)}
              {tweet.text.length > 280 && expandedTweet !== tweet.id && (
                <Button
                  variant="link"
                  onClick={() => setExpandedTweet(tweet.id)}
                  className="p-0 h-auto font-normal text-blue-500"
                >
                  ... Show more
                </Button>
              )}
            </p>
            {tweet.text.match(/#\w+/g) && (
              <div className="mt-2 space-x-1">
                {tweet.text.match(/#\w+/g)!.map((tag, index) => (
                  <Badge key={index} variant="secondary">{tag}</Badge>
                ))}
              </div>
            )}
            {tweet.text.match(/@\w+/g) && (
              <div className="mt-2 space-x-1">
                {tweet.text.match(/@\w+/g)!.map((mention, index) => (
                  <Badge key={index} variant="outline" className="text-blue-500">{mention}</Badge>
                ))}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between text-gray-500">
            <div className="flex items-center space-x-2">
              <MessageCircle className="w-4 h-4" />
              <span>{formatNumber(tweet.comments)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Repeat className="w-4 h-4" />
              <span>{formatNumber(tweet.retweets)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Heart className="w-4 h-4" />
              <span>{formatNumber(tweet.likes)}</span>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <a href={tweet.twitter_link} target="_blank" rel="noopener noreferrer">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </a>
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
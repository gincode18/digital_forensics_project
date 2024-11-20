import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { Badge } from "./ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { CalendarDays, Link, MapPin, Twitter } from 'lucide-react'

interface UserDetails {
  name: string
  username: string
  bio: string
  joined: string
  website: string
  verified: boolean
  location: string
  stats: {
    following: number
    followers: number
  }
  followers: Array<{
    username: string
    displayName: string
    bio: string
    verified: boolean
  }>
  following: Array<{
    username: string
    displayName: string
    bio: string
    verified: boolean
  }>
}

export default function UserDetailsView({ details }: { details: UserDetails }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <Avatar className="w-20 h-20">
            <AvatarImage src={`https://unavatar.io/twitter/${details.username}`} alt={details.name} />
            <AvatarFallback>{details.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-2xl flex items-center gap-2">
              {details.name}
              {details.verified && (
                <Badge variant="secondary" className="text-blue-500">
                  <Twitter className="w-3 h-3 mr-1" />
                  Verified
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-lg">@{details.username}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 mb-4">{details.bio}</p>
          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
            {details.location && (
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-1" />
                {details.location}
              </div>
            )}
            <div className="flex items-center">
              <Link className="w-4 h-4 mr-1" />
              <a href={details.website} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                {details.website}
              </a>
            </div>
            <div className="flex items-center">
              <CalendarDays className="w-4 h-4 mr-1" />
              Joined {details.joined}
            </div>
          </div>
          <div className="flex gap-4 mt-4">
            <div className="font-semibold">
              {details.stats.following.toLocaleString()} <span className="font-normal text-gray-500">Following</span>
            </div>
            <div className="font-semibold">
              {details.stats.followers.toLocaleString()} <span className="font-normal text-gray-500">Followers</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="followers" className="w-full">
        <TabsList className="w-full justify-start bg-blue-100">
          <TabsTrigger value="followers" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">Followers</TabsTrigger>
          <TabsTrigger value="following" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">Following</TabsTrigger>
        </TabsList>
        <TabsContent value="followers">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {details.followers.map((follower) => (
              <UserCard key={follower.username} user={follower} />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="following">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {details.following.map((following) => (
              <UserCard key={following.username} user={following} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function UserCard({ user }: { user: { username: string; displayName: string; bio: string; verified: boolean } }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {user.displayName}
          {user.verified && (
            <Badge variant="secondary" className="text-blue-500">
              <Twitter className="w-3 h-3 mr-1" />
              Verified
            </Badge>
          )}
        </CardTitle>
        <CardDescription>@{user.username}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-700">{user.bio}</p>
      </CardContent>
    </Card>
  )
}
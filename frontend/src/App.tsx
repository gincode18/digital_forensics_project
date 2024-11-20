"use client";

import { useState, useEffect } from "react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Label } from "./components/ui/label";
import { AlertCircle, Download, Loader2, Search, User } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "./components/ui/alert";

export default function Dashboard() {
  const [username, setUsername] = useState(() => {
    const saved = localStorage.getItem("username");
    return saved || "";
  });

  const [tweetCount, setTweetCount] = useState(() => {
    const saved = localStorage.getItem("tweetCount");
    return saved || "10";
  });

  const [userDetails, setUserDetails] = useState(() => {
    const saved = localStorage.getItem("userDetails");
    return saved ? JSON.parse(saved) : null;
  });

  const [userTweets, setUserTweets] = useState(() => {
    const saved = localStorage.getItem("userTweets");
    return saved ? JSON.parse(saved) : null;
  });

  const [report, setReport] = useState(() => {
    const saved = localStorage.getItem("report");
    return saved ? JSON.parse(saved) : null;
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState({
    userDetails: false,
    userTweets: false,
    report: false,
  });

  useEffect(() => {
    localStorage.setItem("username", username);
  }, [username]);

  useEffect(() => {
    localStorage.setItem("tweetCount", tweetCount);
  }, [tweetCount]);

  useEffect(() => {
    localStorage.setItem("userDetails", JSON.stringify(userDetails));
  }, [userDetails]);

  useEffect(() => {
    localStorage.setItem("userTweets", JSON.stringify(userTweets));
  }, [userTweets]);

  useEffect(() => {
    localStorage.setItem("report", JSON.stringify(report));
  }, [report]);

  const fetchUserDetails = async () => {
    setLoading((prev) => ({ ...prev, userDetails: true }));
    try {
      const response = await fetch(
        `http://localhost:3000/api/v1/twitter/userdetails/${username}`
      );
      if (!response.ok) throw new Error("Failed to fetch user details");
      const data = await response.json();
      setUserDetails(data.userdetails);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading((prev) => ({ ...prev, userDetails: false }));
    }
  };

  const fetchUserTweets = async () => {
    setLoading((prev) => ({ ...prev, userTweets: true }));
    try {
      const response = await fetch(
        "http://localhost:3000/api/v1/twitter/usertweets",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username,
            number_of_tweets: parseInt(tweetCount),
          }),
        }
      );
      if (!response.ok) throw new Error("Failed to fetch user tweets");
      const data = await response.json();
      setUserTweets(data.usertweets);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading((prev) => ({ ...prev, userTweets: false }));
    }
  };

  const generateReport = async () => {
    setLoading((prev) => ({ ...prev, report: true }));
    try {
      const response = await fetch(
        "http://localhost:3000/api/v1/twitter/generatereport",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username,
            number_of_tweets: parseInt(tweetCount),
          }),
        }
      );
      if (!response.ok) throw new Error("Failed to generate report");
      const data = await response.json();
      setReport(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading((prev) => ({ ...prev, report: false }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto p-4">
        <h1 className="text-4xl font-bold mb-6 text-blue-800 text-center">
          Social Media Forensics Dashboard
        </h1>

        <Card className="mb-6 shadow-lg border-blue-200 bg-white">
          <CardHeader className="bg-blue-500 text-white rounded-t-lg">
            <CardTitle>User Analysis</CardTitle>
            <CardDescription className="text-blue-100">
              Enter a Twitter username to analyze
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
              <div className="flex-1">
                <Label
                  htmlFor="username"
                  className="text-sm font-medium text-gray-700"
                >
                  Twitter Username
                </Label>
                <Input
                  id="username"
                  placeholder="e.g., elonmusk"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex-1">
                <Label
                  htmlFor="tweetCount"
                  className="text-sm font-medium text-gray-700"
                >
                  Number of Tweets
                </Label>
                <Input
                  id="tweetCount"
                  type="number"
                  placeholder="e.g., 10"
                  value={tweetCount}
                  onChange={(e) => setTweetCount(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2 sm:flex-row sm:justify-between sm:space-y-0 sm:space-x-2">
            <Button
              onClick={fetchUserDetails}
              disabled={loading.userDetails}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
            >
              {loading.userDetails ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <User className="mr-2 h-4 w-4" />
              )}
              {loading.userDetails ? "Fetching..." : "Get User Details"}
            </Button>
            <Button
              onClick={fetchUserTweets}
              disabled={loading.userTweets}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700"
            >
              {loading.userTweets ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              {loading.userTweets ? "Fetching..." : "Fetch Tweets"}
            </Button>
            <Button
              onClick={generateReport}
              disabled={loading.report}
              className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700"
            >
              {loading.report ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              {loading.report ? "Generating..." : "Generate Report"}
            </Button>
          </CardFooter>
        </Card>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="userDetails" className="w-full">
          <TabsList className="w-full justify-start bg-blue-100">
            <TabsTrigger
              value="userDetails"
              className="data-[state=active]:bg-blue-500 data-[state=active]:text-white"
            >
              User Details
            </TabsTrigger>
            <TabsTrigger
              value="userTweets"
              className="data-[state=active]:bg-blue-500 data-[state=active]:text-white"
            >
              User Tweets
            </TabsTrigger>
            <TabsTrigger
              value="report"
              className="data-[state=active]:bg-blue-500 data-[state=active]:text-white"
            >
              Generated Report
            </TabsTrigger>
          </TabsList>
          <TabsContent value="userDetails">
            <Card>
              <CardHeader className="bg-blue-500 text-white">
                <CardTitle>User Details</CardTitle>
              </CardHeader>
              <CardContent>
                {loading.userDetails ? (
                  <div className="flex justify-center items-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  </div>
                ) : userDetails ? (
                  <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-96">
                    {JSON.stringify(userDetails, null, 2)}
                  </pre>
                ) : (
                  <p className="text-gray-600">
                    No user details available. Fetch user details first.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="userTweets">
            <Card>
              <CardHeader className="bg-indigo-500 text-white">
                <CardTitle>User Tweets</CardTitle>
              </CardHeader>
              <CardContent>
                {loading.userTweets ? (
                  <div className="flex justify-center items-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                  </div>
                ) : userTweets ? (
                  <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-96">
                    {JSON.stringify(userTweets, null, 2)}
                  </pre>
                ) : (
                  <p className="text-gray-600">
                    No tweets available. Fetch user tweets first.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="report">
            <Card>
              <CardHeader className="bg-purple-500 text-white">
                <CardTitle>Generated Report</CardTitle>
              </CardHeader>
              <CardContent>
                {loading.report ? (
                  <div className="flex justify-center items-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                  </div>
                ) : report ? (
                  <div className="space-y-4">
                    <p className="text-green-600 font-semibold">
                      Report generated successfully!
                    </p>
                    <a
                      href={report.download_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block bg-purple-500 text-white px-4 py-2 rounded-md hover:bg-purple-600 transition-colors"
                    >
                      Download Report
                    </a>
                  </div>
                ) : (
                  <p className="text-gray-600">
                    No report available. Generate a report first.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

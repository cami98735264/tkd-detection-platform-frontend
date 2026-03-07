"use client"

import { useState } from "react"
import { http } from "@/lib/http"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type Method = "GET" | "POST" | "PUT" | "DELETE"

type HistoryItem = {
  method: Method
  url: string
  time: number
}

type Endpoint = {
  title: string
  url: string
}

const quickEndpoints: Endpoint[] = [
  {
    title: "Get Post 1",
    url: "https://jsonplaceholder.typicode.com/posts/1",
  },
  {
    title: "Get Posts List",
    url: "https://jsonplaceholder.typicode.com/posts",
  },
  {
    title: "404 Error Test",
    url: "https://httpbin.org/status/404",
  },
  {
    title: "500 Error Test",
    url: "https://httpbin.org/status/500",
  },
  {
    title: "Latency Test (2s)",
    url: "https://httpbin.org/delay/2",
  },
]

function getStatusColor(status: number | null) {
  if (!status) return "text-gray-500"

  if (status >= 200 && status < 300) {
    return "text-green-600"
  }

  if (status >= 300 && status < 400) {
    return "text-yellow-600"
  }

  return "text-red-600"
}

export default function HttpPlayground() {

  const [url, setUrl] = useState(
    "https://jsonplaceholder.typicode.com/posts/1"
  )

  const [method, setMethod] = useState<Method>("GET")

  const [body, setBody] = useState(`{
 "title": "hello",
 "body": "testing",
 "userId": 1
}`)

  const [response, setResponse] = useState<any>(null)
  const [status, setStatus] = useState<number | null>(null)
  const [time, setTime] = useState<number | null>(null)

  const [history, setHistory] = useState<HistoryItem[]>([])

  const runRequest = async () => {

    const start = performance.now()

    try {

      let parsedBody = null

      if (method === "POST" || method === "PUT") {
        try {
          parsedBody = JSON.parse(body)
        } catch {
          setResponse({ error: "Invalid JSON body" })
          return
        }
      }

      let result: any

      switch (method) {

        case "GET":
          result = await http.get(url)
          break

        case "POST":
          result = await http.post(url, parsedBody)
          break

        case "PUT":
          result = await http.put(url, parsedBody)
          break

        case "DELETE":
          result = await http.delete(url)
          break
      }

      const end = performance.now()

      const requestTime = Math.round(end - start)

      setTime(requestTime)
      setStatus(200)
      setResponse(result)

      setHistory((prev) => [
        { method, url, time: requestTime },
        ...prev.slice(0, 9),
      ])

    } catch (error: any) {

      const end = performance.now()

      const requestTime = Math.round(end - start)

      setTime(requestTime)

      const errorStatus = error?.status || 500

      setStatus(errorStatus)

      setResponse({
        error: true,
        message: error?.message,
        status: errorStatus,
      })

    }

  }

  const clearAll = () => {
    setResponse(null)
    setStatus(null)
    setTime(null)
    setHistory([])
  }

  return (

    <div className="p-8 max-w-6xl mx-auto space-y-6">

      <Card>

        <CardHeader>
          <CardTitle>HTTP Playground PRO</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">

          {/* METHOD */}

          <div className="flex gap-2">

            {["GET","POST","PUT","DELETE"].map((m) => (

              <Button
                key={m}
                variant={method === m ? "default" : "outline"}
                onClick={() => setMethod(m as Method)}
              >
                {m}
              </Button>

            ))}

          </div>

          {/* URL */}

          <Input
            value={url}
            onChange={(e) => setUrl(e.currentTarget.value)}
            placeholder="https://api.example.com"
          />

          {/* QUICK ENDPOINTS */}

          <div className="flex flex-wrap gap-2">

            {quickEndpoints.map((endpoint) => (

              <Button
                key={endpoint.title}
                variant="secondary"
                onClick={() => setUrl(endpoint.url)}
              >
                {endpoint.title}
              </Button>

            ))}

          </div>

          {/* BODY */}

          {(method === "POST" || method === "PUT") && (

            <Textarea
              rows={8}
              value={body}
              onChange={(e) => setBody(e.currentTarget.value)}
              placeholder="JSON body"
            />

          )}

          {/* ACTIONS */}

          <div className="flex gap-2">

            <Button onClick={runRequest}>
              Run Request
            </Button>

            <Button
              variant="destructive"
              onClick={clearAll}
            >
              Clear
            </Button>

          </div>

        </CardContent>

      </Card>

      {/* RESPONSE */}

      <Card>

        <CardHeader>
          <CardTitle>Response</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">

          <div className="flex gap-6 text-sm font-medium">

            <div className={getStatusColor(status)}>
              Status: {status ?? "-"}
            </div>

            <div className="text-gray-500">
              Time: {time ? `${time} ms` : "-"}
            </div>

          </div>

          <pre className="text-sm overflow-auto whitespace-pre-wrap">
            {response
              ? JSON.stringify(response, null, 2)
              : "No response yet"}
          </pre>

        </CardContent>

      </Card>

      {/* HISTORY */}

      <Card>

        <CardHeader>
          <CardTitle>Request History</CardTitle>
        </CardHeader>

        <CardContent>

          <div className="space-y-2 text-sm">

            {history.length === 0 && "No requests yet"}

            {history.map((item, i) => (

              <div
                key={i}
                className="flex justify-between border p-2 rounded"
              >
                <div>{item.method}</div>
                <div className="truncate">{item.url}</div>
                <div>{item.time} ms</div>
              </div>

            ))}

          </div>

        </CardContent>

      </Card>

    </div>
  )
}
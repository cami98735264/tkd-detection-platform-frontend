import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { emitHttpEvent } from "@/lib/httpEventBus";

export default function HttpPlayground() {
  const emit = (status: number) => {
    if (status >= 200 && status < 300) {
      emitHttpEvent({
        type: "success",
        status,
        message: `Simulated success ${status}`,
      });
      return;
    }

    if (status >= 400 && status < 500) {
      emitHttpEvent({
        type: "warning",
        status,
        message: `Simulated client error ${status}`,
      });
      return;
    }

    emitHttpEvent({
      type: "error",
      status,
      message: `Simulated server error ${status}`,
    });
  };

  const networkError = () => {
    emitHttpEvent({
      type: "error",
      status: 0,
      message: "Network timeout simulated",
    });
  };

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <h1 className="text-3xl font-bold">
        HTTP Feedback Playground
      </h1>

      {/* SUCCESS */}
      <Card>
        <CardHeader>
          <CardTitle>Success</CardTitle>
        </CardHeader>

        <CardContent className="flex gap-4 flex-wrap">
          <Button onClick={() => emit(200)}>
            200 Success
          </Button>

          <Button onClick={() => emit(201)}>
            201 Created
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* CLIENT ERRORS */}
      <Card>
        <CardHeader>
          <CardTitle>Client Errors</CardTitle>
        </CardHeader>

        <CardContent className="flex gap-4 flex-wrap">
          <Button
            variant="secondary"
            onClick={() => emit(400)}
          >
            400 Bad Request
          </Button>

          <Button
            variant="secondary"
            onClick={() => emit(401)}
          >
            401 Unauthorized
          </Button>

          <Button
            variant="secondary"
            onClick={() => emit(403)}
          >
            403 Forbidden
          </Button>

          <Button
            variant="secondary"
            onClick={() => emit(404)}
          >
            404 Not Found
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* SERVER ERRORS */}
      <Card>
        <CardHeader>
          <CardTitle>Server Errors</CardTitle>
        </CardHeader>

        <CardContent className="flex gap-4 flex-wrap">
          <Button
            variant="destructive"
            onClick={() => emit(500)}
          >
            500 Server Error
          </Button>

          <Button
            variant="destructive"
            onClick={() => emit(503)}
          >
            503 Service Unavailable
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* NETWORK */}
      <Card>
        <CardHeader>
          <CardTitle>Network</CardTitle>
        </CardHeader>

        <CardContent>
          <Button
            variant="outline"
            onClick={networkError}
          >
            Timeout / Network error
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}